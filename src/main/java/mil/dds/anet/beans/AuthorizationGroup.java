package mil.dds.anet.beans;

import java.util.List;
import java.util.Objects;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.lists.AbstractAnetBeanList.PositionList;
import mil.dds.anet.beans.lists.AbstractAnetBeanList.ReportList;
import mil.dds.anet.beans.search.PositionSearchQuery;
import mil.dds.anet.beans.search.ReportSearchQuery;
import mil.dds.anet.graphql.GraphQLFetcher;
import mil.dds.anet.graphql.GraphQLIgnore;
import mil.dds.anet.graphql.GraphQLParam;
import mil.dds.anet.utils.Utils;
import mil.dds.anet.views.AbstractAnetBean;

public class AuthorizationGroup extends AbstractAnetBean {

	public static enum AuthorizationGroupStatus { ACTIVE, INACTIVE }

	private String name;
	private String description;
	private List<Position> positions;
	private AuthorizationGroupStatus status;

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = Utils.trimStringReturnNull(name);
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = Utils.trimStringReturnNull(description);
	}

	@GraphQLFetcher("positions")
	public List<Position> loadPositions() {
		if (positions == null) {
			positions = AnetObjectEngine.getInstance().getAuthorizationGroupDao().getPositionsForAuthorizationGroup(this);
		}
		return positions;
	}

	@GraphQLIgnore
	public List<Position> getPositions() {
		return positions;
	}

	public void setPositions(List<Position> positions) {
		this.positions = positions;
	}

	public AuthorizationGroupStatus getStatus() {
		return status;
	}

	public void setStatus(AuthorizationGroupStatus status) {
		this.status = status;
	}

	@GraphQLFetcher("reports")
	public ReportList fetchReports(@GraphQLParam("pageNum") int pageNum, @GraphQLParam("pageSize") int pageSize) {
		ReportSearchQuery query = new ReportSearchQuery();
		query.setPageNum(pageNum);
		query.setPageSize(pageSize);
		query.setAuthorizationGroupId(id);
		return AnetObjectEngine.getInstance().getReportDao().search(query);
	}

	@GraphQLFetcher("paginatedPositions")
	public PositionList fetchPositions(@GraphQLParam("pageNum") int pageNum, @GraphQLParam("pageSize") int pageSize) {
		PositionSearchQuery query = new PositionSearchQuery();
		query.setPageNum(pageNum);
		query.setPageSize(pageSize);
		query.setAuthorizationGroupId(id);
		return AnetObjectEngine.getInstance().getPositionDao().search(query);
	}

	@Override
	public boolean equals(Object o) {
		if (o == null || o.getClass() != this.getClass()) {
			return false;
		}
		AuthorizationGroup a = (AuthorizationGroup) o;
		return Objects.equals(a.getId(), id)
				&& Objects.equals(a.getName(), name)
				&& Objects.equals(a.getDescription(), description)
				&& Objects.equals(a.getPositions(), positions)
				&& Objects.equals(a.getStatus(), status);
	}

	@Override
	public int hashCode() {
		return Objects.hash(id, name, description, positions, status);
	}

	@Override
	public String toString() {
		return String.format("(%d) - %s", id, name);
	}

}
