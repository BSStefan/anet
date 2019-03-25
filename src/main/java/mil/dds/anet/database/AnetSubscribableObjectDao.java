package mil.dds.anet.database;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.common.base.Joiner;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.SubscribableObject;
import mil.dds.anet.utils.DaoUtils;
import mil.dds.anet.views.AbstractAnetBean;
import ru.vyarus.guicey.jdbi3.tx.InTransaction;

@InTransaction
public abstract class AnetSubscribableObjectDao<T extends AbstractAnetBean & SubscribableObject> extends AnetBaseDao<T> {

	public AnetSubscribableObjectDao(String entityTag, String tableName, String fieldList, String orderBy) {
		super(entityTag, tableName, fieldList, orderBy);
	}

	public abstract SubscriptionUpdateGroup getSubscriptionUpdate(T obj);

	@Override
	public int update(T obj) {
		DaoUtils.setUpdateFields(obj);
		final int numRows = updateInternal(obj);
		if (numRows > 0) {
			final SubscriptionUpdateGroup subscriptionUpdate = getSubscriptionUpdate(obj);
			final SubscriptionDao subscriptionDao = AnetObjectEngine.getInstance().getSubscriptionDao();
			subscriptionDao.updateSubscriptions(subscriptionUpdate);
		}
		return numRows;
	}

	@Override
	public int delete(String uuid) {
		final T obj = getObjectForSubscriptionDelete(uuid);
		final int numRows = deleteInternal(uuid);
		if (numRows > 0 && obj != null) {
			obj.setUuid(uuid);
			DaoUtils.setUpdateFields(obj);
			final SubscriptionUpdateGroup subscriptionUpdate = getSubscriptionUpdate(obj);
			final SubscriptionDao subscriptionDao = AnetObjectEngine.getInstance().getSubscriptionDao();
			subscriptionDao.updateSubscriptions(subscriptionUpdate);
		}
		return numRows;
	}

	/* override this method if you want to update subscriptions on delete */
	protected T getObjectForSubscriptionDelete(String uuid) {
		return null;
	}

	protected SubscriptionUpdateGroup getCommonSubscriptionUpdate(AbstractAnetBean obj, String tableName, String paramName) {
		final boolean isParam = (obj != null);
		final String uuid = isParam ? obj.getUuid() : null;
		final SubscriptionUpdateStatement update = getCommonSubscriptionUpdateStatement(isParam, uuid, tableName, paramName);
		if (update == null) {
			return null;
		}
		final Instant updatedAt = isParam ? obj.getUpdatedAt() : null;
		return new SubscriptionUpdateGroup(tableName, uuid, updatedAt, update);
	}

	protected static SubscriptionUpdateStatement getCommonSubscriptionUpdateStatement(boolean isParam, String uuid, String tableName, String paramName) {
		if ((isParam && uuid == null) || tableName == null || paramName == null) {
			return null;
		}
		final Map<String, Object> params = new HashMap<>();
		if (isParam) {
			params.put(paramName, uuid);
		}
		return new SubscriptionUpdateStatement(tableName, paramOrJoin(paramName, isParam), params);
	}

	protected static String paramOrJoin(String field, boolean isParam) {
		return isParam ? (":" + field) : escapeSqlField(field);
	}

	private static String escapeSqlField(String field) {
		final List<String> parts = new ArrayList<>();
		for (final String part : field.split("\\.")) {
			parts.add("\"" + part + "\"");
		}
		return Joiner.on(".").join(parts);
	}

}
