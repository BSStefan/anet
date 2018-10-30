package mil.dds.anet.search;

import org.jdbi.v3.core.Handle;

import mil.dds.anet.beans.AuthorizationGroup;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.AuthorizationGroupSearchQuery;

public interface IAuthorizationGroupSearcher {

	public AnetBeanList<AuthorizationGroup> runSearch(AuthorizationGroupSearchQuery query, Handle dbHandle);

}
