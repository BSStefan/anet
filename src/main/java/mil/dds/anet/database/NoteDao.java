package mil.dds.anet.database;

import io.leangen.graphql.annotations.GraphQLRootContext;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.ListIterator;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.jdbi.v3.core.Handle;
import org.jdbi.v3.core.statement.Query;
import org.jdbi.v3.sqlobject.config.RegisterRowMapper;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.Note;
import mil.dds.anet.beans.NoteRelatedObject;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.database.mappers.NoteMapper;
import mil.dds.anet.database.mappers.NoteRelatedObjectMapper;
import mil.dds.anet.utils.DaoUtils;
import mil.dds.anet.views.ForeignKeyFetcher;

@RegisterRowMapper(NoteMapper.class)
public class NoteDao extends AnetBaseDao<Note> {

	private final IdBatcher<Note> idBatcher;
	private final ForeignKeyBatcher<Note> notesBatcher;
	private final ForeignKeyBatcher<NoteRelatedObject> noteRelatedObjectsBatcher;

	public NoteDao(Handle h) {
		super(h, "Notes", "notes", "*", null);
		final String idBatcherSql = "/* batch.getNotesByUuids */ SELECT * FROM notes WHERE uuid IN ( <uuids> )";
		this.idBatcher = new IdBatcher<Note>(h, idBatcherSql, "uuids", new NoteMapper());

		final String notesBatcherSql = "/* batch.getNotesForRelatedObject */ SELECT * FROM \"noteRelatedObjects\" "
				+ "INNER JOIN notes ON \"noteRelatedObjects\".\"noteUuid\" = notes.uuid "
				+ "WHERE \"noteRelatedObjects\".\"relatedObjectUuid\" IN ( <foreignKeys> ) "
				+ "ORDER BY notes.\"updatedAt\" DESC";
		this.notesBatcher = new ForeignKeyBatcher<Note>(h, notesBatcherSql, "foreignKeys", new NoteMapper(), "relatedObjectUuid");

		final String noteRelatedObjectsBatcherSql = "/* batch.getNoteRelatedObjects */ SELECT * FROM \"noteRelatedObjects\" "
				+ "WHERE \"noteUuid\" IN ( <foreignKeys> ) ORDER BY \"relatedObjectType\", \"relatedObjectuuid\" ASC";
		this.noteRelatedObjectsBatcher = new ForeignKeyBatcher<NoteRelatedObject>(h, noteRelatedObjectsBatcherSql, "foreignKeys", new NoteRelatedObjectMapper(), "noteUuid");
	}

	public AnetBeanList<Note> getAll(int pageNum, int pageSize) {
		final String sql;
		if (DaoUtils.isMsSql(dbHandle)) {
			sql = "/* getAllNotes */ SELECT notes.*, COUNT(*) OVER() AS totalCount "
					+ "FROM notes ORDER BY \"updatedAt\" DESC "
					+ "OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY";
		} else {
			sql = "/* getAllNotes */ SELECT * from notes "
					+ "ORDER BY \"updatedAt\" DESC LIMIT :limit OFFSET :offset";
		}

		final Query query = dbHandle.createQuery(sql)
			.bind("limit", pageSize)
			.bind("offset", pageSize * pageNum);
		return new AnetBeanList<Note>(query, pageNum, pageSize, new NoteMapper(), null);
	}

	public Note getByUuid(String uuid) {
		return getByIds(Arrays.asList(uuid)).get(0);
	}

	@Override
	public List<Note> getByIds(List<String> uuids) {
		return idBatcher.getByIds(uuids);
	}

	@Override
	public Note insert(Note obj) {
		DaoUtils.setInsertFields(obj);
		return AnetObjectEngine.getInstance().executeInTransaction(this::insertWithSubscriptions, obj);
	}

	private Note insertWithSubscriptions(Note obj) {
		final Note note = insertInternal(obj);
		updateSubscriptions(1, note);
		return note;
	}

	@Override
	public Note insertInternal(Note n) {
		dbHandle.createUpdate(
				"/* insertNote */ INSERT INTO notes (uuid, \"authorUuid\", text, \"createdAt\", \"updatedAt\") "
					+ "VALUES (:uuid, :authorUuid, :text, :createdAt, :updatedAt)")
			.bindBean(n)
			.bind("createdAt", DaoUtils.asLocalDateTime(n.getCreatedAt()))
			.bind("updatedAt", DaoUtils.asLocalDateTime(n.getUpdatedAt()))
			.bind("authorUuid", n.getAuthorUuid())
			.execute();
		insertNoteRelatedObjects(dbHandle, DaoUtils.getUuid(n), n.getNoteRelatedObjects());
		return n;
	}

	@Override
	public int update(Note obj) {
		DaoUtils.setUpdateFields(obj);
		return AnetObjectEngine.getInstance().executeInTransaction(this::updateWithSubscriptions, obj);
	}

	private int updateWithSubscriptions(Note obj) {
		final int numRows = updateInternal(obj);
		updateSubscriptions(numRows, obj);
		return numRows;
	}

	@Override
	public int updateInternal(Note n) {
		deleteNoteRelatedObjects(dbHandle, DaoUtils.getUuid(n)); // seems the easiest thing to do
		insertNoteRelatedObjects(dbHandle, DaoUtils.getUuid(n), n.getNoteRelatedObjects());
		return dbHandle.createUpdate("/* updateNote */ UPDATE notes "
					+ "SET text = :text, \"updatedAt\" = :updatedAt WHERE uuid = :uuid")
				.bindBean(n)
				.bind("updatedAt", DaoUtils.asLocalDateTime(n.getUpdatedAt()))
				.execute();
	}

	@Override
	public int delete(String uuid) {
		return AnetObjectEngine.getInstance().executeInTransaction(this::deleteWithSubscriptions, uuid);
	}

	private int deleteWithSubscriptions(String uuid) {
		final Note note = getByUuid(uuid);
		note.loadNoteRelatedObjects(AnetObjectEngine.getInstance().getContext()).join();
		DaoUtils.setUpdateFields(note);
		updateSubscriptions(1, note);
		return deleteInternal(uuid);
	}

	@Override
	public int deleteInternal(String uuid) {
		deleteNoteRelatedObjects(dbHandle, uuid);
		return dbHandle.createUpdate("/* deleteNote */ DELETE FROM notes where uuid = :uuid")
			.bind("uuid", uuid)
			.execute();
	}

	public CompletableFuture<List<Note>> getNotesForRelatedObject(@GraphQLRootContext Map<String, Object> context, String relatedObjectUuid) {
		return new ForeignKeyFetcher<Note>()
				.load(context, "noteRelatedObject.notes", relatedObjectUuid);
	}

	public List<List<Note>> getNotes(List<String> foreignKeys) {
		return notesBatcher.getByForeignKeys(foreignKeys);
	}

	public List<List<NoteRelatedObject>> getNoteRelatedObjects(List<String> foreignKeys) {
		return noteRelatedObjectsBatcher.getByForeignKeys(foreignKeys);
	}

	public CompletableFuture<List<NoteRelatedObject>> getRelatedObjects(Map<String, Object> context, Note note) {
		return new ForeignKeyFetcher<NoteRelatedObject>()
				.load(context, "note.noteRelatedObjects", note.getUuid());
	}

	private void insertNoteRelatedObjects(Handle h, String uuid, List<NoteRelatedObject> noteRelatedObjects) {
		for (final NoteRelatedObject nro : noteRelatedObjects) {
			h.createUpdate(
					"/* insertNoteRelatedObject */ INSERT INTO \"noteRelatedObjects\" (\"noteUuid\", \"relatedObjectType\", \"relatedObjectUuid\") "
						+ "VALUES (:noteUuid, :relatedObjectType, :relatedObjectUuid)")
				.bindBean(nro)
				.bind("noteUuid", uuid)
				.execute();
		}
	}

	private void deleteNoteRelatedObjects(Handle h, String uuid) {
		h.execute("/* deleteNoteRelatedObjects */ DELETE FROM \"noteRelatedObjects\" WHERE \"noteUuid\" = ?", uuid);
	}

	private void updateSubscriptions(int numRows, Note obj) {
		if (numRows > 0) {
			final SubscriptionUpdate subscriptionUpdate = getSubscriptionUpdate(obj);
			final SubscriptionDao subscriptionDao = AnetObjectEngine.getInstance().getSubscriptionDao();
			subscriptionDao.updateSubscriptions(subscriptionUpdate);
		}
	}

	private SubscriptionUpdate getSubscriptionUpdate(Note obj) {
		final String paramTpl = "noteRelatedObject%1$d";
		final List<SubscriptionUpdateStatement> stmts = new ArrayList<>();
		final ListIterator<NoteRelatedObject> iter = obj.getNoteRelatedObjects().listIterator();
		while (iter.hasNext()) {
			final String param = String.format(paramTpl, iter.nextIndex());
			final NoteRelatedObject nro = iter.next();
			stmts.add(AnetSubscribableObjectDao.getCommonSubscriptionUpdateStatement(nro.getRelatedObjectUuid(), nro.getRelatedObjectType(), param));
		}
		return new SubscriptionUpdate(obj.getUpdatedAt(), stmts);
	}
}
