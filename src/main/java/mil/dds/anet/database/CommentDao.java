package mil.dds.anet.database;

import java.util.List;

import org.skife.jdbi.v2.Handle;

import mil.dds.anet.beans.Comment;
import mil.dds.anet.beans.Report;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.database.mappers.CommentMapper;
import mil.dds.anet.utils.DaoUtils;

public class CommentDao implements IAnetDao<Comment> {

	private static String[] fields = {"uuid", "createdAt", "updatedAt", "authorUuid", "reportUuid", "text"};
	private static String tableName = "comments";
	public static String COMMENT_FIELDS = DaoUtils.buildFieldAliases(tableName, fields, true);

	private final Handle dbHandle;
	private final IdBatcher<Comment> idBatcher;

	public CommentDao(Handle dbHandle) { 
		this.dbHandle = dbHandle;
		final String idBatcherSql = "/* batch.getCommentsByUuids */ SELECT " + COMMENT_FIELDS + ", " + PersonDao.PERSON_FIELDS
				+ "FROM comments LEFT JOIN people ON comments.\"authorUuid\" = people.uuid "
				+ "WHERE comments.uuid IN ( %1$s )";
		this.idBatcher = new IdBatcher<Comment>(dbHandle, idBatcherSql, new CommentMapper());
	}
	
	@Override
	public AnetBeanList<?> getAll(int pageNum, int pageSize) {
		throw new UnsupportedOperationException();
	}

	public Comment getByUuid(String uuid) {
		return dbHandle.createQuery("/* getCommentByUuid */ SELECT " + COMMENT_FIELDS + ", " + PersonDao.PERSON_FIELDS
				+ "FROM comments LEFT JOIN people ON comments.\"authorUuid\" = people.uuid "
				+ "WHERE comments.uuid = :uuid")
			.bind("uuid", uuid)
			.map(new CommentMapper())
			.first();
	}

	@Override
	public List<Comment> getByIds(List<String> uuids) {
		return idBatcher.getByIds(uuids);
	}

	@Override
	public Comment insert(Comment c) {
		DaoUtils.setInsertFields(c);
		dbHandle.createStatement("/* insertComment */ "
				+ "INSERT INTO comments (uuid, \"reportUuid\", \"authorUuid\", \"createdAt\", \"updatedAt\", text)"
				+ "VALUES (:uuid, :reportUuid, :authorUuid, :createdAt, :updatedAt, :text)")
			.bindFromProperties(c)
			.bind("authorUuid", DaoUtils.getUuid(c.getAuthor()))
			.execute();
		return c;
	}

	public int update(Comment c) {
		DaoUtils.setUpdateFields(c);
		return dbHandle.createStatement("/* updateComment */ UPDATE comments SET text = :text, \"updatedAt\" = :updatedAt WHERE uuid = :uuid")
			.bindFromProperties(c)
			.execute();
	}

	public List<Comment> getCommentsForReport(Report report) {
		return dbHandle.createQuery("/* getCommentForReport */ SELECT " + COMMENT_FIELDS + ", " + PersonDao.PERSON_FIELDS
				+ "FROM comments LEFT JOIN people ON comments.\"authorUuid\" = people.uuid "
				+ "WHERE comments.\"reportUuid\" = :reportUuid ORDER BY comments.\"createdAt\" ASC")
			.bind("reportUuid", report.getUuid())
			.map(new CommentMapper())
			.list();
	}

	public int delete(String commentUuid) {
		return dbHandle.createStatement("/* deleteComment */ DELETE FROM comments where uuid = :uuid")
			.bind("uuid", commentUuid)
			.execute();
		
	}

}
