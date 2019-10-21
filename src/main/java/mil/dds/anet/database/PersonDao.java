package mil.dds.anet.database;

import java.lang.invoke.MethodHandles;
import java.sql.Blob;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import javax.sql.rowset.serial.SerialBlob;
import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.Person.PersonStatus;
import mil.dds.anet.beans.PersonPositionHistory;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.PersonSearchQuery;
import mil.dds.anet.database.mappers.PersonMapper;
import mil.dds.anet.database.mappers.PersonPositionHistoryMapper;
import mil.dds.anet.utils.DaoUtils;
import mil.dds.anet.utils.FkDataLoaderKey;
import mil.dds.anet.views.ForeignKeyFetcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import ru.vyarus.guicey.jdbi3.tx.InTransaction;

public class PersonDao extends AnetBaseDao<Person, PersonSearchQuery> {

  private static String[] fields = {"uuid", "name", "status", "role", "emailAddress", "phoneNumber",
      "rank", "biography", "country", "gender", "endOfTourDate", "domainUsername",
      "pendingVerification", "createdAt", "updatedAt", "avatar"};
  public static String TABLE_NAME = "people";
  public static String PERSON_FIELDS = DaoUtils.buildFieldAliases(TABLE_NAME, fields, true);
  public static String PERSON_FIELDS_NOAS = DaoUtils.buildFieldAliases(TABLE_NAME, fields, false);

  private static final Logger logger =
      LoggerFactory.getLogger(MethodHandles.lookup().lookupClass());

  public Person getByUuid(String uuid) {
    return getByIds(Arrays.asList(uuid)).get(0);
  }

  static class SelfIdBatcher extends IdBatcher<Person> {
    private static final String sql = "/* batch.getPeopleByUuids */ SELECT " + PERSON_FIELDS
        + " FROM people WHERE uuid IN ( <uuids> )";

    public SelfIdBatcher() {
      super(sql, "uuids", new PersonMapper());
    }
  }

  @Override
  public List<Person> getByIds(List<String> uuids) {
    final IdBatcher<Person> idBatcher =
        AnetObjectEngine.getInstance().getInjector().getInstance(SelfIdBatcher.class);
    return idBatcher.getByIds(uuids);
  }

  static class PersonPositionHistoryBatcher extends ForeignKeyBatcher<PersonPositionHistory> {
    private static final String sql =
        "/* batch.getPersonPositionHistory */ SELECT * FROM \"peoplePositions\" "
            + "WHERE \"personUuid\" IN ( <foreignKeys> ) ORDER BY \"createdAt\" ASC";

    public PersonPositionHistoryBatcher() {
      super(sql, "foreignKeys", new PersonPositionHistoryMapper(), "personUuid");
    }
  }

  public List<List<PersonPositionHistory>> getPersonPositionHistory(List<String> foreignKeys) {
    final ForeignKeyBatcher<PersonPositionHistory> personPositionHistoryBatcher = AnetObjectEngine
        .getInstance().getInjector().getInstance(PersonPositionHistoryBatcher.class);
    return personPositionHistoryBatcher.getByForeignKeys(foreignKeys);
  }

  @Override
  public Person insertInternal(Person p) {
    StringBuilder sql = new StringBuilder();
    sql.append("/* personInsert */ INSERT INTO people "
        + "(uuid, name, status, role, \"emailAddress\", \"phoneNumber\", rank, \"pendingVerification\", "
        + "gender, country, avatar, \"endOfTourDate\", biography, \"domainUsername\", \"createdAt\", \"updatedAt\") "
        + "VALUES (:uuid, :name, :status, :role, :emailAddress, :phoneNumber, :rank, :pendingVerification, "
        + ":gender, :country, :avatar, ");
    if (DaoUtils.isMsSql()) {
      // MsSql requires an explicit CAST when datetime2 might be NULL.
      sql.append("CAST(:endOfTourDate AS datetime2), ");
    } else {
      sql.append(":endOfTourDate, ");
    }
    sql.append(":biography, :domainUsername, :createdAt, :updatedAt);");
    getDbHandle().createUpdate(sql.toString()).bindBean(p)
        .bind("createdAt", DaoUtils.asLocalDateTime(p.getCreatedAt()))
        .bind("updatedAt", DaoUtils.asLocalDateTime(p.getUpdatedAt()))
        .bind("endOfTourDate", DaoUtils.asLocalDateTime(p.getEndOfTourDate()))
        .bind("status", DaoUtils.getEnumId(p.getStatus()))
        .bind("role", DaoUtils.getEnumId(p.getRole()))
        .bind("avatar", convertImageToBlob(p.getAvatar())).execute();
    return p;
  }

  @Override
  public int updateInternal(Person p) {
    StringBuilder sql = new StringBuilder("/* personUpdate */ UPDATE people "
        + "SET name = :name, status = :status, role = :role, "
        + "gender = :gender, country = :country,  \"emailAddress\" = :emailAddress, "
        + "\"avatar\" = :avatar,"
        + "\"phoneNumber\" = :phoneNumber, rank = :rank, biography = :biography, "
        + "\"pendingVerification\" = :pendingVerification, \"domainUsername\" = :domainUsername, "
        + "\"updatedAt\" = :updatedAt, ");

    if (DaoUtils.isMsSql()) {
      // MsSql requires an explicit CAST when datetime2 might be NULL.
      sql.append("\"endOfTourDate\" = CAST(:endOfTourDate AS datetime2) ");
    } else {
      sql.append("\"endOfTourDate\" = :endOfTourDate ");
    }
    sql.append("WHERE uuid = :uuid");

    return getDbHandle().createUpdate(sql.toString()).bindBean(p)
        .bind("updatedAt", DaoUtils.asLocalDateTime(p.getUpdatedAt()))
        .bind("endOfTourDate", DaoUtils.asLocalDateTime(p.getEndOfTourDate()))
        .bind("status", DaoUtils.getEnumId(p.getStatus()))
        .bind("role", DaoUtils.getEnumId(p.getRole()))
        .bind("avatar", convertImageToBlob(p.getAvatar())).execute();
  }

  @Override
  public AnetBeanList<Person> search(PersonSearchQuery query) {
    return AnetObjectEngine.getInstance().getSearcher().getPersonSearcher().runSearch(query);
  }

  @InTransaction
  public List<Person> findByDomainUsername(String domainUsername) {
    return getDbHandle()
        .createQuery("/* findByDomainUsername */ SELECT " + PERSON_FIELDS + ","
            + PositionDao.POSITIONS_FIELDS
            + "FROM people LEFT JOIN positions ON people.uuid = positions.\"currentPersonUuid\" "
            + "WHERE people.\"domainUsername\" = :domainUsername "
            + "AND people.status != :inactiveStatus")
        .bind("domainUsername", domainUsername)
        .bind("inactiveStatus", DaoUtils.getEnumId(PersonStatus.INACTIVE)).map(new PersonMapper())
        .list();
  }

  @InTransaction
  public List<Person> getRecentPeople(Person author, int maxResults) {
    String sql;
    if (DaoUtils.isMsSql()) {
      sql = "/* getRecentPeople */ SELECT " + PersonDao.PERSON_FIELDS
          + "FROM people WHERE people.uuid IN ( "
          + "SELECT top(:maxResults) \"reportPeople\".\"personUuid\" "
          + "FROM reports JOIN \"reportPeople\" ON reports.uuid = \"reportPeople\".\"reportUuid\" "
          + "WHERE \"authorUuid\" = :authorUuid AND \"personUuid\" != :authorUuid "
          + "GROUP BY \"personUuid\" ORDER BY MAX(reports.\"createdAt\") DESC)";
    } else {
      sql = "/* getRecentPeople */ SELECT " + PersonDao.PERSON_FIELDS
          + "FROM people WHERE people.uuid IN ( SELECT \"reportPeople\".\"personUuid\" "
          + "FROM reports JOIN \"reportPeople\" ON reports.uuid = \"reportPeople\".\"reportUuid\" "
          + "WHERE \"authorUuid\" = :authorUuid AND \"personUuid\" != :authorUuid "
          + "GROUP BY \"personUuid\" ORDER BY MAX(reports.\"createdAt\") DESC "
          + "LIMIT :maxResults)";
    }
    return getDbHandle().createQuery(sql).bind("authorUuid", author.getUuid())
        .bind("maxResults", maxResults).map(new PersonMapper()).list();
  }

  @InTransaction
  public int mergePeople(Person winner, Person loser) {
    // delete duplicates where other is primary, or where neither is primary
    getDbHandle().createUpdate("DELETE FROM \"reportPeople\" WHERE ("
        + "\"personUuid\" = :loserUuid AND \"reportUuid\" IN ("
        + "SELECT \"reportUuid\" FROM \"reportPeople\" WHERE \"personUuid\" = :winnerUuid AND \"isPrimary\" = :isPrimary"
        + ")) OR (\"personUuid\" = :winnerUuid AND \"reportUuid\" IN ("
        + "SELECT \"reportUuid\" FROM \"reportPeople\" WHERE \"personUuid\" = :loserUuid AND \"isPrimary\" = :isPrimary"
        + ")) OR ("
        + "\"personUuid\" = :loserUuid AND \"isPrimary\" != :isPrimary AND \"reportUuid\" IN ("
        + "SELECT \"reportUuid\" FROM \"reportPeople\" WHERE \"personUuid\" = :winnerUuid AND \"isPrimary\" != :isPrimary"
        + "))").bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid())
        .bind("isPrimary", true).execute();

    // update report attendance, should now be unique
    getDbHandle().createUpdate(
        "UPDATE \"reportPeople\" SET \"personUuid\" = :winnerUuid WHERE \"personUuid\" = :loserUuid")
        .bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid()).execute();

    // update approvals this person might have done
    getDbHandle().createUpdate(
        "UPDATE \"reportActions\" SET \"personUuid\" = :winnerUuid WHERE \"personUuid\" = :loserUuid")
        .bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid()).execute();

    // report author update
    getDbHandle()
        .createUpdate(
            "UPDATE reports SET \"authorUuid\" = :winnerUuid WHERE \"authorUuid\" = :loserUuid")
        .bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid()).execute();

    // comment author update
    getDbHandle()
        .createUpdate(
            "UPDATE comments SET \"authorUuid\" = :winnerUuid WHERE \"authorUuid\" = :loserUuid")
        .bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid()).execute();

    // update position history
    getDbHandle().createUpdate(
        "UPDATE \"peoplePositions\" SET \"personUuid\" = :winnerUuid WHERE \"personUuid\" = :loserUuid")
        .bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid()).execute();

    // update note authors
    getDbHandle()
        .createUpdate(
            "UPDATE \"notes\" SET \"authorUuid\" = :winnerUuid WHERE \"authorUuid\" = :loserUuid")
        .bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid()).execute();

    // update note related objects where we don't already have the same note for the winnerUuid
    getDbHandle().createUpdate(
        "UPDATE \"noteRelatedObjects\" SET \"relatedObjectUuid\" = :winnerUuid WHERE \"relatedObjectUuid\" = :loserUuid"
            + " AND \"noteUuid\" NOT IN ("
            + "SELECT \"noteUuid\" FROM \"noteRelatedObjects\" WHERE \"relatedObjectUuid\" = :winnerUuid"
            + ")")
        .bind("winnerUuid", winner.getUuid()).bind("loserUuid", loser.getUuid()).execute();

    // now delete obsolete note related objects
    getDbHandle()
        .createUpdate("DELETE FROM \"noteRelatedObjects\" WHERE \"relatedObjectUuid\" = :loserUuid")
        .bind("loserUuid", loser.getUuid()).execute();

    // delete the person!
    return getDbHandle().createUpdate("DELETE FROM people WHERE uuid = :loserUuid")
        .bind("loserUuid", loser.getUuid()).execute();
  }

  public CompletableFuture<List<PersonPositionHistory>> getPositionHistory(
      Map<String, Object> context, String personUuid) {
    return new ForeignKeyFetcher<PersonPositionHistory>()
        .load(context, FkDataLoaderKey.PERSON_PERSON_POSITION_HISTORY, personUuid)
        .thenApply(l -> PersonPositionHistory.getDerivedHistory(l));
  }

  private static Blob convertImageToBlob(String image) {
    try {
      return image == null ? null : new SerialBlob(image.getBytes());
    } catch (SQLException e) {
      logger.error("Failed to save avatar", e);
      return null;
    }
  }
}
