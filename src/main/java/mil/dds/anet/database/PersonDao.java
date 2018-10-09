package mil.dds.anet.database;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.skife.jdbi.v2.Handle;
import org.skife.jdbi.v2.Query;
import org.skife.jdbi.v2.TransactionCallback;
import org.skife.jdbi.v2.TransactionStatus;

import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.PersonPositionHistory;
import mil.dds.anet.beans.Person.PersonStatus;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.PersonSearchQuery;
import mil.dds.anet.database.mappers.PersonMapper;
import mil.dds.anet.database.mappers.PersonPositionHistoryMapper;
import mil.dds.anet.utils.DaoUtils;
import mil.dds.anet.views.ForeignKeyFetcher;

public class PersonDao extends AnetBaseDao<Person> {

	private static String[] fields = {"uuid","name","status","role",
			"emailAddress","phoneNumber","rank","biography",
			"country", "gender", "endOfTourDate",
			"domainUsername","pendingVerification","createdAt",
			"updatedAt"};
	private static String tableName = "people";
	public static String PERSON_FIELDS = DaoUtils.buildFieldAliases(tableName, fields, true);
	public static String PERSON_FIELDS_NOAS = DaoUtils.buildFieldAliases(tableName, fields, false);

	private final IdBatcher<Person> idBatcher;
	private final ForeignKeyBatcher<PersonPositionHistory> personPositionHistoryBatcher;

	public PersonDao(Handle h) { 
		super(h, "Person", tableName, PERSON_FIELDS, null);
		final String idBatcherSql = "/* batch.getPeopleByUuids */ SELECT " + PERSON_FIELDS + " FROM people WHERE uuid IN ( %1$s )";
		this.idBatcher = new IdBatcher<Person>(h, idBatcherSql, new PersonMapper());
		final String personPositionHistoryBatcherSql = "/* batch.getPersonPositionHistory */ SELECT \"peoplePositions\".\"positionUuid\" AS \"positionUuid\", "
				+ "\"peoplePositions\".\"personUuid\" AS \"personUuid\", "
				+ "\"peoplePositions\".\"createdAt\" AS pph_createdAt, "
				+ PositionDao.POSITIONS_FIELDS + " FROM \"peoplePositions\" "
				+ "LEFT JOIN positions ON \"peoplePositions\".\"positionUuid\" = positions.uuid "
				+ "WHERE \"personUuid\" IN ( %1$s ) ORDER BY \"peoplePositions\".\"createdAt\" ASC";
		this.personPositionHistoryBatcher = new ForeignKeyBatcher<PersonPositionHistory>(h, personPositionHistoryBatcherSql, new PersonPositionHistoryMapper(), "personUuid");
	}
	
	public AnetBeanList<Person> getAll(int pageNum, int pageSize) {
		Query<Person> query = getPagedQuery(pageNum, pageSize, new PersonMapper());
		Long manualCount = getSqliteRowCount();
		return new AnetBeanList<Person>(query, pageNum, pageSize, manualCount);
	}

	public Person getByUuid(String uuid) {
		return dbHandle.createQuery("/* personGetByUuid */ SELECT " + PERSON_FIELDS + " FROM people WHERE uuid = :uuid")
				.bind("uuid",  uuid)
				.map(new PersonMapper())
				.first();
	}

	@Override
	public List<Person> getByIds(List<String> uuids) {
		return idBatcher.getByIds(uuids);
	}

	public List<List<PersonPositionHistory>> getPersonPositionHistory(List<String> foreignKeys) {
		return personPositionHistoryBatcher.getByForeignKeys(foreignKeys);
	}

	public Person insert(Person p) {
		DaoUtils.setInsertFields(p);
		StringBuilder sql = new StringBuilder();
		sql.append("/* personInsert */ INSERT INTO people " 
				+ "(uuid, name, status, role, \"emailAddress\", \"phoneNumber\", rank, \"pendingVerification\", "
				+ "gender, country, \"endOfTourDate\", biography, \"domainUsername\", \"createdAt\", \"updatedAt\") "
				+ "VALUES (:uuid, :name, :status, :role, :emailAddress, :phoneNumber, :rank, :pendingVerification, "
				+ ":gender, :country, ");
		if (DaoUtils.isMsSql(dbHandle)) {
			//MsSql requires an explicit CAST when datetime2 might be NULL. 
			sql.append("CAST(:endOfTourDate AS datetime2), ");
		} else {
			sql.append(":endOfTourDate, ");
		}
		sql.append(":biography, :domainUsername, :createdAt, :updatedAt);");

		dbHandle.createStatement(sql.toString())
			.bindFromProperties(p)
			.bind("status", DaoUtils.getEnumId(p.getStatus()))
			.bind("role", DaoUtils.getEnumId(p.getRole()))
			.execute();
		return p;
	}
	
	public int update(Person p) {
		DaoUtils.setUpdateFields(p);
		StringBuilder sql = new StringBuilder("/* personUpdate */ UPDATE people "
				+ "SET name = :name, status = :status, role = :role, "
				+ "gender = :gender, country = :country,  \"emailAddress\" = :emailAddress, "
				+ "\"phoneNumber\" = :phoneNumber, rank = :rank, biography = :biography, "
				+ "\"pendingVerification\" = :pendingVerification, \"domainUsername\" = :domainUsername, "
				+ "\"updatedAt\" = :updatedAt, ");
		if (DaoUtils.isMsSql(dbHandle)) {
			//MsSql requires an explicit CAST when datetime2 might be NULL. 
			sql.append("\"endOfTourDate\" = CAST(:endOfTourDate AS datetime2) ");
		} else {
			sql.append("\"endOfTourDate\" = :endOfTourDate ");
		}
		sql.append("WHERE uuid = :uuid");
		return dbHandle.createStatement(sql.toString())
			.bindFromProperties(p)
			.bind("status", DaoUtils.getEnumId(p.getStatus()))
			.bind("role", DaoUtils.getEnumId(p.getRole()))
			.execute();
	}
	
	public AnetBeanList<Person> search(PersonSearchQuery query) {
		return AnetObjectEngine.getInstance().getSearcher()
				.getPersonSearcher().runSearch(query, dbHandle);
	}

	public List<Person> findByDomainUsername(String domainUsername) {
		return dbHandle.createQuery("/* findByDomainUsername */ SELECT " + PERSON_FIELDS + "," + PositionDao.POSITIONS_FIELDS 
				+ "FROM people LEFT JOIN positions ON people.uuid = positions.\"currentPersonUuid\" "
				+ "WHERE people.\"domainUsername\" = :domainUsername "
				+ "AND people.status != :inactiveStatus")
			.bind("domainUsername", domainUsername)
			.bind("inactiveStatus", DaoUtils.getEnumId(PersonStatus.INACTIVE))
			.map(new PersonMapper())
			.list();
	}

	public List<Person> getRecentPeople(Person author, int maxResults) {
		String sql;
		if (DaoUtils.isMsSql(dbHandle)) {
			sql = "/* getRecentPeople */ SELECT " + PersonDao.PERSON_FIELDS
				+ "FROM people WHERE people.uuid IN ( "
					+ "SELECT top(:maxResults) \"reportPeople\".\"personUuid\" "
					+ "FROM reports JOIN \"reportPeople\" ON reports.uuid = \"reportPeople\".\"reportUuid\" "
					+ "WHERE \"authorUuid\" = :authorUuid "
					+ "AND \"personUuid\" != :authorUuid "
					+ "GROUP BY \"personUuid\" "
					+ "ORDER BY MAX(reports.\"createdAt\") DESC"
				+ ")";
		} else {
			sql = "/* getRecentPeople */ SELECT " + PersonDao.PERSON_FIELDS
				+ "FROM people WHERE people.uuid IN ( "
					+ "SELECT \"reportPeople\".\"personUuid\" "
					+ "FROM reports JOIN \"reportPeople\" ON reports.uuid = \"reportPeople\".\"reportUuid\" "
					+ "WHERE \"authorUuid\" = :authorUuid "
					+ "AND \"personUuid\" != :authorUuid "
					+ "GROUP BY \"personUuid\" "
					+ "ORDER BY MAX(reports.\"createdAt\") DESC "
					+ "LIMIT :maxResults"
				+ ")";
		}
		return dbHandle.createQuery(sql)
				.bind("authorUuid", author.getUuid())
				.bind("maxResults", maxResults)
				.map(new PersonMapper())
				.list();
	}

	public int mergePeople(Person winner, Person loser, Boolean copyPosition) {
		return dbHandle.inTransaction(new TransactionCallback<Integer>() {
			public Integer inTransaction(Handle conn, TransactionStatus status) throws Exception {
				//delete duplicates where other is primary, or where neither is primary
				dbHandle.createStatement("DELETE FROM \"reportPeople\" WHERE ("
						+ "\"personUuid\" = :loserUuid AND \"reportUuid\" IN ("
							+ "SELECT \"reportUuid\" FROM \"reportPeople\" WHERE \"personUuid\" = :winnerUuid AND \"isPrimary\" = :isPrimary"
						+ ")) OR ("
						+ "\"personUuid\" = :winnerUuid AND \"reportUuid\" IN ("
							+ "SELECT \"reportUuid\" FROM \"reportPeople\" WHERE \"personUuid\" = :loserUuid AND \"isPrimary\" = :isPrimary"
						+ ")) OR ("
						+ "\"personUuid\" = :loserUuid AND \"isPrimary\" != :isPrimary AND \"reportUuid\" IN ("
							+ "SELECT \"reportUuid\" FROM \"reportPeople\" WHERE \"personUuid\" = :winnerUuid AND \"isPrimary\" != :isPrimary"
						+ "))")
					.bind("winnerUuid", winner.getUuid())
					.bind("loserUuid", loser.getUuid())
					.bind("isPrimary", true)
					.execute();
				//update report attendance, should now be unique
				dbHandle.createStatement("UPDATE \"reportPeople\" SET \"personUuid\" = :winnerUuid WHERE \"personUuid\" = :loserUuid")
					.bind("winnerUuid", winner.getUuid())
					.bind("loserUuid", loser.getUuid())
					.execute();
				
				// update approvals this person might have done
				dbHandle.createStatement("UPDATE \"approvalActions\" SET \"personUuid\" = :winnerUuid WHERE \"personUuid\" = :loserUuid")
					.bind("winnerUuid", winner.getUuid())
					.bind("loserUuid", loser.getUuid())
					.execute();
				
				// report author update
				dbHandle.createStatement("UPDATE reports SET \"authorUuid\" = :winnerUuid WHERE \"authorUuid\" = :loserUuid")
					.bind("winnerUuid", winner.getUuid())
					.bind("loserUuid", loser.getUuid())
					.execute();
			
				// comment author update
				dbHandle.createStatement("UPDATE comments SET \"authorUuid\" = :winnerUuid WHERE \"authorUuid\" = :loserUuid")
					.bind("winnerUuid", winner.getUuid())
					.bind("loserUuid", loser.getUuid())
					.execute();
				
				// update position history
				dbHandle.createStatement("UPDATE \"peoplePositions\" SET \"personUuid\" = :winnerUuid WHERE \"personUuid\" = :loserUuid")
					.bind("winnerUuid", winner.getUuid())
					.bind("loserUuid", loser.getUuid())
					.execute();
		
				//delete the person!
				return dbHandle.createStatement("DELETE FROM people WHERE uuid = :loserUuid")
					.bind("loserUuid", loser.getUuid())
					.execute();
			}
		});

	}

	public CompletableFuture<List<PersonPositionHistory>> getPositionHistory(Map<String, Object> context, Person person) {
		return new ForeignKeyFetcher<PersonPositionHistory>()
				.load(context, "person.personPositionHistory", person.getUuid())
				.thenApply(l ->
		{
			return PersonPositionHistory.getDerivedHistory(l);
		});
	}

}
