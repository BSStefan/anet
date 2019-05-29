package mil.dds.anet.search.sqlite;

import mil.dds.anet.beans.Organization;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.Report;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.ISearchQuery.SortOrder;
import mil.dds.anet.beans.search.ReportSearchQuery;
import mil.dds.anet.database.ReportDao;
import mil.dds.anet.database.mappers.ReportMapper;
import mil.dds.anet.search.AbstractReportSearcher;
import mil.dds.anet.search.AbstractSearchQueryBuilder;
import mil.dds.anet.utils.Utils;
import ru.vyarus.guicey.jdbi3.tx.InTransaction;

public class SqliteReportSearcher extends AbstractReportSearcher {

  private final String isoDowFormat;
  private final SqliteSearchQueryBuilder<Report, ReportSearchQuery> outerQb;

  public SqliteReportSearcher(String isoDowFormat) {
    super(new SqliteSearchQueryBuilder<Report, ReportSearchQuery>(""));
    this.isoDowFormat = isoDowFormat;
    outerQb = new SqliteSearchQueryBuilder<Report, ReportSearchQuery>("SqliteReportSearch");
  }

  public SqliteReportSearcher() {
    this("strftime('%%w', substr(\"%s\", 1, 10)) + 1"); // %w day of week 0-6 with Sunday==0
  }

  @Override
  protected void buildQuery(ReportSearchQuery query, Person user, boolean systemSearch) {
    qb.addSelectClause("reports.uuid");
    super.buildQuery(query, user, systemSearch);
  }

  @InTransaction
  @Override
  public AnetBeanList<Report> runSearch(ReportSearchQuery query, Person user,
      boolean systemSearch) {
    buildQuery(query, user, systemSearch);
    outerQb.addSelectClause("DISTINCT " + ReportDao.REPORT_FIELDS);
    if (query.getIncludeEngagementDayOfWeek()) {
      outerQb.addSelectClause(String.format(this.isoDowFormat, "reports.\"engagementDate\"")
          + " AS engagementDayOfWeek");
    }
    outerQb.addFromClause("reports");
    outerQb.addSelectClause("reports.uuid IN ( " + qb.build() + " )");
    outerQb.addSqlArgs(qb.getSqlArgs());
    outerQb.addListArgs(qb.getListArgs());
    addOrderByClauses(outerQb, query);
    final AnetBeanList<Report> result =
        outerQb.buildAndRun(getDbHandle(), query, new ReportMapper());
    for (final Report report : result.getList()) {
      report.setUser(user);
    }
    return result;
  }

  @Override
  protected void addOrderByClauses(AbstractSearchQueryBuilder<?, ?> qb, ReportSearchQuery query) {
    switch (query.getSortBy()) {
      case ENGAGEMENT_DATE:
        qb.addAllOrderByClauses(
            Utils.addOrderBy(query.getSortOrder(), "reports", "\"engagementDate\""));
        break;
      case RELEASED_AT:
        qb.addAllOrderByClauses(
            Utils.addOrderBy(query.getSortOrder(), "reports", "\"releasedAt\""));
        break;
      case UPDATED_AT:
        qb.addAllOrderByClauses(
            Utils.addOrderBy(query.getSortOrder(), "reports", "\"releasedAt\""));
        break;
      case CREATED_AT:
      default:
        qb.addAllOrderByClauses(Utils.addOrderBy(query.getSortOrder(), "reports", "\"updatedAt\""));
        break;
    }
    qb.addAllOrderByClauses(Utils.addOrderBy(SortOrder.ASC, "reports", "uuid"));
  }

  @Override
  protected void addTextQuery(ReportSearchQuery query) {
    qb.addWhereClause("(text LIKE '%' || :text || '%' OR intent LIKE '%' || :text || '%'"
        + " OR \"keyOutcomes\" LIKE '%' || :text || '%'"
        + " OR \"nextSteps\" LIKE '%' || :text || '%' OR tags.name LIKE '%' || :text || '%'"
        + " OR tags.description LIKE '%' || :text || '%')");
    final String text = query.getText();
    qb.addSqlArg("text", Utils.getSqliteFullTextQuery(text));
  }

  @Override
  protected void addIncludeEngagementDayOfWeekQuery(ReportSearchQuery query) {
    // added in {@link #runSearch}
  }

  @Override
  protected void addEngagementDayOfWeekQuery(ReportSearchQuery query) {
    qb.addEqualsClause("engagementDayOfWeek",
        String.format(this.isoDowFormat, "reports.\"engagementDate\""),
        query.getEngagementDayOfWeek());
  }

  @Override
  protected void addOrgUuidQuery(ReportSearchQuery query) {
    if (!query.getIncludeOrgChildren()) {
      qb.addWhereClause(
          "(reports.\"advisorOrganizationUuid\" = :orgUuid OR reports.\"principalOrganizationUuid\" = :orgUuid)");
    } else {
      outerQb.addWithClause("RECURSIVE parent_orgs(uuid) AS ("
          + " SELECT uuid FROM organizations WHERE uuid = :orgUuid UNION ALL"
          + " SELECT o.uuid FROM parent_orgs po, organizations o WHERE o.\"parentOrgUuid\" = po.uuid"
          + ")");
      qb.addWhereClause("(reports.\"advisorOrganizationUuid\" IN (SELECT uuid FROM parent_orgs)"
          + " OR reports.\"principalOrganizationUuid\" IN (SELECT uuid FROM parent_orgs))");
    }
    qb.addSqlArg("orgUuid", query.getOrgUuid());
  }

  @Override
  protected void addAdvisorOrgUuidQuery(ReportSearchQuery query) {
    if (Organization.DUMMY_ORG_UUID.equals(query.getAdvisorOrgUuid())) {
      qb.addWhereClause("reports.\"advisorOrganizationUuid\" IS NULL");
    } else if (!query.getIncludeAdvisorOrgChildren()) {
      qb.addEqualsClause("advisorOrganizationUuid", "reports.\"advisorOrganizationUuid\"",
          query.getAdvisorOrgUuid());
    } else {
      outerQb.addWithClause("RECURSIVE advisor_parent_orgs(uuid) AS ("
          + " SELECT uuid FROM organizations WHERE uuid = :advisorOrgUuid UNION ALL"
          + " SELECT o.uuid FROM advisor_parent_orgs po, organizations o WHERE o.\"parentOrgUuid\" = po.uuid"
          + ")");
      qb.addWhereClause(
          "reports.\"advisorOrganizationUuid\" IN (SELECT uuid FROM advisor_parent_orgs)");
      qb.addSqlArg("advisorOrgUuid", query.getAdvisorOrgUuid());
    }
  }

  @Override
  protected void addPrincipalOrgUuidQuery(ReportSearchQuery query) {
    if (Organization.DUMMY_ORG_UUID.equals(query.getPrincipalOrgUuid())) {
      qb.addWhereClause("reports.\"principalOrganizationUuid\" IS NULL");
    } else if (!query.getIncludePrincipalOrgChildren()) {
      qb.addEqualsClause("principalOrganizationUuid", "reports.\"principalOrganizationUuid\"",
          query.getPrincipalOrgUuid());
    } else {
      outerQb.addWithClause("RECURSIVE principal_parent_orgs(uuid) AS ("
          + " SELECT uuid FROM organizations WHERE uuid = :principalOrgUuid UNION ALL"
          + " SELECT o.uuid FROM principal_parent_orgs po, organizations o WHERE o.\"parentOrgUuid\" = po.uuid"
          + ")");
      qb.addWhereClause(
          "reports.\"principalOrganizationUuid\" IN (SELECT uuid FROM principal_parent_orgs)");
      qb.addSqlArg("principalOrgUuid", query.getPrincipalOrgUuid());
    }
  }

}
