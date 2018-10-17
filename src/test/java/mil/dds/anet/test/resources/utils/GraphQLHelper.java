package mil.dds.anet.test.resources.utils;

import java.util.List;
import java.util.Map;

import javax.ws.rs.client.Client;
import javax.ws.rs.core.GenericType;

import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.AbstractSearchQuery;
import mil.dds.anet.views.AbstractAnetBean;

public final class GraphQLHelper {

	private static final String getWithParamFmt = "query ($%1$s: %2$s!) { payload: %3$s (%1$s: $%1$s) { %4$s } }";
	private static final String getFmt = "query { payload: %1$s { %2$s } }";
	private static final String getAllFmt = "query { payload: %1$s { pageNum pageSize totalCount list { %2$s } } }";
	private static final String createFmt = "mutation ($%1$s: %2$s!) { payload: %3$s (%1$s: $%1$s) { id } }";
	private static final String updateFmt = "mutation ($%1$s: %2$s!) { payload: %3$s (%1$s: $%1$s) }";
	private static final String updateObjectFmt = "mutation ($%1$s: %2$s!) { payload: %3$s (%1$s: $%1$s) { %4$s } }";
	private static final String searchFmt = "query ($%1$s: %2$s!) { payload: %3$s (%1$s: $%1$s) { pageNum pageSize totalCount list { %4$s } } }";

	private final GraphQLClient graphQLClient;

	public GraphQLHelper(Client client, int localPort) {
		graphQLClient = new GraphQLClient(client, localPort);
	}

	/**
	 * @return the object matching the id
	 */
	public <T extends AbstractAnetBean> T getObjectById(Person user, String getQuery, String fields, Integer id, GenericType<GraphQLResponse<T>> responseType) {
		return getObject(user, getQuery, "id", fields, "Int", id, responseType);
	}

	/**
	 * @return the object matching the param (usually the id)
	 */
	public <T extends AbstractAnetBean> T getObject(Person user, String getQuery, String paramName, String fields, String paramType, Object param, GenericType<GraphQLResponse<T>> responseType) {
		final String q = String.format(getWithParamFmt, paramName, paramType, getQuery, fields);
		return graphQLClient.doGraphQLQuery(user, q, paramName, param, responseType);
	}

	/**
	 * @return the requested object
	 */
	public <T extends AbstractAnetBean> T getObject(Person user, String getQuery, String fields, GenericType<GraphQLResponse<T>> responseType) {
		final String q = String.format(getFmt, getQuery, fields);
		return graphQLClient.doGraphQLQuery(user, q, null, null, responseType);
	}

	/**
	 * @return all objects of the requested type
	 */
	public <T extends AbstractAnetBean> AnetBeanList<T> getAllObjects(Person user, String getQuery, String fields, GenericType<GraphQLResponse<AnetBeanList<T>>> responseType) {
		final String q = String.format(getAllFmt, getQuery, fields);
		return graphQLClient.doGraphQLQuery(user, q, null, null, responseType);
	}

	/**
	 * @return a list of objects of the requested type
	 */
	public <T extends AbstractAnetBean> List<T> getObjectList(Person user, String getQuery, String fields, GenericType<GraphQLResponse<List<T>>> responseType) {
		final String q = String.format(getFmt, getQuery, fields);
		return graphQLClient.doGraphQLQuery(user, q, null, null, responseType);
	}

	/**
	 * @return a list of objects of the requested type matching the variables
	 */
	public <T> List<T> getObjectList(Person user, String getQuery, Map<String,Object> variables, GenericType<GraphQLResponse<List<T>>> responseType) {
		return graphQLClient.doGraphQLQuery(user, getQuery, variables, responseType);
	}

	/**
	 * @return id of the newly created object
	 */
	public <T extends AbstractAnetBean> Integer createObject(Person user, String createQuery, String paramName, String paramType, T param, GenericType<GraphQLResponse<T>> responseType) {
		final String q = String.format(createFmt, paramName, paramType, createQuery);
		final T obj = graphQLClient.doGraphQLQuery(user, q, paramName, param, responseType);
		return (obj == null) ? null : obj.getId();
	}

	/**
	 * @return the number of objects updated
	 */
	public <T extends AbstractAnetBean> Integer updateObject(Person user, String updateQuery, String paramName, String paramType, T param) {
		final String q = String.format(updateFmt, paramName, paramType, updateQuery);
		return graphQLClient.doGraphQLQuery(user, q, paramName, param, new GenericType<GraphQLResponse<Integer>>() {});
	}

	/**
	 * @return the updated object
	 */
	public <T extends AbstractAnetBean> T updateObject(Person user, String updateQuery, String paramName, String fields, String paramType, Object param, GenericType<GraphQLResponse<T>> responseType) {
		final String q = String.format(updateObjectFmt, paramName, paramType, updateQuery, fields);
		return graphQLClient.doGraphQLQuery(user, q, paramName, param, responseType);
	}

	/**
	 * @return the number of objects updated
	 */
	public <T extends AbstractAnetBean> Integer updateObject(Person user, String updateQuery, Map<String,Object> variables) {
		return graphQLClient.doGraphQLQuery(user, updateQuery, variables, new GenericType<GraphQLResponse<Integer>>() {});
	}

	/**
	 * @return the updated object
	 */
	public <T extends AbstractAnetBean> T updateObject(Person user, String updateQuery, Map<String,Object> variables, GenericType<GraphQLResponse<T>> responseType) {
		return graphQLClient.doGraphQLQuery(user, updateQuery, variables, responseType);
	}

	/**
	 * @return the number of objects deleted
	 */
	public <T extends AbstractAnetBean> Integer deleteObject(Person user, String deleteQuery, Integer id) {
		final String q = String.format(updateFmt, "id", "Int", deleteQuery);
		return graphQLClient.doGraphQLQuery(user, q, "id", id, new GenericType<GraphQLResponse<Integer>>() {});
	}

	/**
	 * @return the object list matching the search query
	 */
	public <T extends AbstractAnetBean> AnetBeanList<T> searchObjects(Person user, String searchQuery, String paramName, String paramType, String fields, AbstractSearchQuery param, GenericType<GraphQLResponse<AnetBeanList<T>>> responseType) {
		final String q = String.format(searchFmt, paramName, paramType, searchQuery, fields);
		return graphQLClient.doGraphQLQuery(user, q, paramName, param, responseType);
	}

}
