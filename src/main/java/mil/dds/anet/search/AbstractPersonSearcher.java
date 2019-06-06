package mil.dds.anet.search;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.ISearchQuery.SortOrder;
import mil.dds.anet.beans.search.PersonSearchQuery;
import mil.dds.anet.database.mappers.PersonMapper;
import mil.dds.anet.search.AbstractSearchQueryBuilder.Comparison;

public abstract class AbstractPersonSearcher extends AbstractSearcher<Person, PersonSearchQuery>
    implements IPersonSearcher {

  public AbstractPersonSearcher(AbstractSearchQueryBuilder<Person, PersonSearchQuery> qb) {
    super(qb);
  }

  @Override
  public AnetBeanList<Person> runSearch(PersonSearchQuery query, Person user) {
    buildQuery(query, user);
    return qb.buildAndRun(getDbHandle(), query, new PersonMapper());
  }

  @Override
  protected final void buildQuery(PersonSearchQuery query) {
    throw new UnsupportedOperationException();
  }

  protected void buildQuery(PersonSearchQuery query, Person user) {
    qb.addFromClause("people");

    if (query.getOrgUuid() != null || query.getLocationUuid() != null
        || query.getMatchPositionName()) {
      qb.addFromClause("LEFT JOIN positions ON people.uuid = positions.\"currentPersonUuid\"");
    }

    if (query.isTextPresent()) {
      addTextQuery(query);
    }

    if (user != null && query.getSubscribed()) {
      qb.addWhereClause(Searcher.getSubscriptionReferences(user, qb.getSqlArgs(),
          AnetObjectEngine.getInstance().getPersonDao().getSubscriptionUpdate(null)));
    }

    qb.addDateClause("startDate", "people.\"endOfTourDate\"", Comparison.AFTER,
        query.getEndOfTourDateStart());
    qb.addDateClause("endDate", "people.\"endOfTourDate\"", Comparison.BEFORE,
        query.getEndOfTourDateEnd());
    qb.addEqualsClause("role", "people.role", query.getRole());
    qb.addInClause("statuses", "people.status", query.getStatus());
    qb.addEqualsClause("rank", "people.rank", query.getRank());
    qb.addEqualsClause("country", "people.country", query.getCountry());
    qb.addEqualsClause("pendingVerification", "people.\"pendingVerification\"",
        query.getPendingVerification());

    if (query.getOrgUuid() != null) {
      addOrgUuidQuery(query);
    }

    qb.addEqualsClause("locationUuid", "positions.\"locationUuid\"", query.getLocationUuid());

    addOrderByClauses(qb, query);
  }

  protected abstract void addTextQuery(PersonSearchQuery query);

  protected abstract void addOrgUuidQuery(PersonSearchQuery query);

  protected void addOrderByClauses(AbstractSearchQueryBuilder<?, ?> qb, PersonSearchQuery query) {
    switch (query.getSortBy()) {
      case CREATED_AT:
        qb.addAllOrderByClauses(getOrderBy(query.getSortOrder(), "people", "\"createdAt\""));
        break;
      case RANK:
        qb.addAllOrderByClauses(getOrderBy(query.getSortOrder(), "people", "rank"));
        break;
      case NAME:
      default:
        qb.addAllOrderByClauses(getOrderBy(query.getSortOrder(), "people", "name"));
        break;
    }
    qb.addAllOrderByClauses(getOrderBy(SortOrder.ASC, "people", "uuid"));
  }

}
