package mil.dds.anet.search;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.Task;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.ISearchQuery.SortOrder;
import mil.dds.anet.beans.search.TaskSearchQuery;
import mil.dds.anet.database.mappers.TaskMapper;
import mil.dds.anet.search.AbstractSearchQueryBuilder.Comparison;
import ru.vyarus.guicey.jdbi3.tx.InTransaction;

public abstract class AbstractTaskSearcher extends AbstractSearcher<Task, TaskSearchQuery>
    implements ITaskSearcher {

  public AbstractTaskSearcher(AbstractSearchQueryBuilder<Task, TaskSearchQuery> qb) {
    super(qb);
  }

  @InTransaction
  @Override
  public AnetBeanList<Task> runSearch(TaskSearchQuery query, Person user) {
    buildQuery(query, user);
    return qb.buildAndRun(getDbHandle(), query, new TaskMapper());
  }

  @Override
  protected final void buildQuery(TaskSearchQuery query) {
    throw new UnsupportedOperationException();
  }

  protected void buildQuery(TaskSearchQuery query, Person user) {
    qb.addSelectClause("tasks.*");
    qb.addTotalCount();
    qb.addFromClause("tasks");

    if (query.isTextPresent()) {
      addTextQuery(query);
    }

    if (user != null && query.getSubscribed()) {
      qb.addWhereClause(Searcher.getSubscriptionReferences(user, qb.getSqlArgs(),
          AnetObjectEngine.getInstance().getTaskDao().getSubscriptionUpdate(null)));
    }

    if (query.getResponsibleOrgUuid() != null) {
      addResponsibleOrgUuidQuery(query);
    }

    qb.addEqualsClause("category", "tasks.category", query.getCategory());
    qb.addEqualsClause("status", "tasks.status", query.getStatus());
    qb.addLikeClause("projectStatus", "tasks.\"customFieldEnum1\"", query.getProjectStatus());
    qb.addDateClause("plannedCompletionStart", "tasks.\"plannedCompletion\"", Comparison.AFTER,
        query.getPlannedCompletionStart());
    qb.addDateClause("plannedCompletionEnd", "tasks.\"plannedCompletion\"", Comparison.BEFORE,
        query.getPlannedCompletionEnd());
    qb.addDateClause("projectedCompletionStart", "tasks.\"projectedCompletion\"", Comparison.AFTER,
        query.getProjectedCompletionStart());
    qb.addDateClause("projectedCompletionEnd", "tasks.\"projectedCompletion\"", Comparison.BEFORE,
        query.getProjectedCompletionEnd());
    qb.addLikeClause("customField", "tasks.\"customField\"", query.getCustomField());

    if (query.getCustomFieldRef1Uuid() != null) {
      addCustomFieldRef1UuidQuery(query);
    }

    addOrderByClauses(qb, query);
  }

  protected abstract void addTextQuery(TaskSearchQuery query);

  protected abstract void addResponsibleOrgUuidQuery(TaskSearchQuery query);

  protected abstract void addCustomFieldRef1UuidQuery(TaskSearchQuery query);

  protected void addOrderByClauses(AbstractSearchQueryBuilder<?, ?> qb, TaskSearchQuery query) {
    switch (query.getSortBy()) {
      case CREATED_AT:
        qb.addAllOrderByClauses(getOrderBy(query.getSortOrder(), "tasks", "\"createdAt\""));
        break;
      case CATEGORY:
        qb.addAllOrderByClauses(getOrderBy(query.getSortOrder(), "tasks", "category"));
        break;
      case NAME:
      default:
        qb.addAllOrderByClauses(
            getOrderBy(query.getSortOrder(), "tasks", "\"shortName\"", "\"longName\""));
        break;
    }
    qb.addAllOrderByClauses(getOrderBy(SortOrder.ASC, "tasks", "uuid"));
  }

}
