package mil.dds.anet.search;

import mil.dds.anet.beans.Location;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.ISearchQuery.SortOrder;
import mil.dds.anet.beans.search.LocationSearchQuery;
import mil.dds.anet.database.mappers.LocationMapper;
import ru.vyarus.guicey.jdbi3.tx.InTransaction;

public abstract class AbstractLocationSearcher
    extends AbstractSearcher<Location, LocationSearchQuery> implements ILocationSearcher {

  public AbstractLocationSearcher(AbstractSearchQueryBuilder<Location, LocationSearchQuery> qb) {
    super(qb);
  }

  @InTransaction
  @Override
  public AnetBeanList<Location> runSearch(LocationSearchQuery query) {
    buildQuery(query);
    return qb.buildAndRun(getDbHandle(), query, new LocationMapper());
  }

  protected void buildQuery(LocationSearchQuery query) {
    qb.addSelectClause("locations.*");
    qb.addTotalCount();
    qb.addFromClause("locations");

    if (query.isTextPresent()) {
      addTextQuery(query);
    }

    addOrderByClauses(qb, query);
  }

  protected abstract void addTextQuery(LocationSearchQuery query);

  protected void addOrderByClauses(AbstractSearchQueryBuilder<?, ?> qb, LocationSearchQuery query) {
    switch (query.getSortBy()) {
      case CREATED_AT:
        qb.addAllOrderByClauses(getOrderBy(query.getSortOrder(), "locations", "\"createdAt\""));
        break;
      case NAME:
      default:
        qb.addAllOrderByClauses(getOrderBy(query.getSortOrder(), "locations", "name"));
        break;
    }
    qb.addAllOrderByClauses(getOrderBy(SortOrder.ASC, "locations", "uuid"));
  }

}
