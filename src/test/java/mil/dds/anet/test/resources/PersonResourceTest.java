package mil.dds.anet.test.resources;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;

import javax.ws.rs.ForbiddenException;
import javax.ws.rs.NotFoundException;
import javax.ws.rs.core.GenericType;

import org.joda.time.DateTime;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;

import com.google.common.collect.ImmutableList;

import mil.dds.anet.beans.Organization;
import mil.dds.anet.beans.Organization.OrganizationType;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.Person.PersonStatus;
import mil.dds.anet.beans.Person.Role;
import mil.dds.anet.beans.Position;
import mil.dds.anet.beans.Position.PositionStatus;
import mil.dds.anet.beans.Position.PositionType;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.ISearchQuery.SortOrder;
import mil.dds.anet.beans.search.OrganizationSearchQuery;
import mil.dds.anet.beans.search.PersonSearchQuery;
import mil.dds.anet.beans.search.PersonSearchQuery.PersonSearchSortBy;
import mil.dds.anet.test.beans.OrganizationTest;
import mil.dds.anet.test.resources.utils.GraphQLResponse;

public class PersonResourceTest extends AbstractResourceTest {

	private static final String POSITION_FIELDS = "id name";
	private static final String PERSON_FIELDS = "id name status role emailAddress phoneNumber rank biography country"
			+ " gender endOfTourDate domainUsername pendingVerification createdAt updatedAt";
	private static final String FIELDS = PERSON_FIELDS + " position { " + POSITION_FIELDS + " }";

	@Rule
	public ExpectedException thrown = ExpectedException.none();

	@Test
	public void testCreatePerson() {
		final Person jack = getJackJackson();

		Person retPerson = graphQLHelper.getObjectById(jack, "person", FIELDS, jack.getId(), new GenericType<GraphQLResponse<Person>>() {});
		assertThat(retPerson).isEqualTo(jack);
		assertThat(retPerson.getId()).isEqualTo(jack.getId());

		Person newPerson = new Person();
		newPerson.setName("testCreatePerson Person");
		newPerson.setRole(Role.ADVISOR);
		newPerson.setStatus(PersonStatus.ACTIVE);
		newPerson.setBiography("Created buy the PersonResourceTest#testCreatePerson");
		newPerson.setGender("Female");
		newPerson.setCountry("Canada");
		newPerson.setEndOfTourDate(new DateTime(2020,4,1,0,0,0));
		Integer newPersonId = graphQLHelper.createObject(admin, "createPerson", "person", "PersonInput",
				newPerson, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(newPersonId).isNotNull();
		newPerson = graphQLHelper.getObjectById(admin, "person", FIELDS, newPersonId, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(newPerson.getId()).isNotNull();
		assertThat(newPerson.getName()).isEqualTo("testCreatePerson Person");

		newPerson.setName("testCreatePerson updated name");
		newPerson.setCountry("The Commonwealth of Canada");
		Integer nrUpdated = graphQLHelper.updateObject(admin, "updatePerson", "person", "PersonInput", newPerson);
		assertThat(nrUpdated).isEqualTo(1);

		retPerson = graphQLHelper.getObjectById(jack, "person", FIELDS, newPerson.getId(), new GenericType<GraphQLResponse<Person>>() {});
		assertThat(retPerson.getName()).isEqualTo(newPerson.getName());
		
		//Test creating a person with a position already set. 
		final OrganizationSearchQuery query = new OrganizationSearchQuery();
		query.setText("EF 6");
		query.setType(OrganizationType.ADVISOR_ORG);
		final AnetBeanList<Organization> orgs = graphQLHelper.searchObjects(jack, "organizationList", "query", "OrganizationSearchQueryInput",
				"id shortName", query, new GenericType<GraphQLResponse<AnetBeanList<Organization>>>() {});
		assertThat(orgs.getList().size()).isGreaterThan(0);
		Organization org = orgs.getList().stream().filter(o -> o.getShortName().equalsIgnoreCase("EF 6")).findFirst().get();

		Position newPos = new Position();
		newPos.setType(PositionType.ADVISOR);
		newPos.setName("Test Position");
		newPos.setOrganization(org);
		newPos.setStatus(PositionStatus.ACTIVE);
		Integer newPosId = graphQLHelper.createObject(admin, "createPosition", "position", "PositionInput",
				newPos, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(newPosId).isNotNull();
		newPos = graphQLHelper.getObjectById(admin, "position", POSITION_FIELDS, newPosId, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(newPos.getId()).isNotNull();
		
		Person newPerson2 = new Person();
		newPerson2.setName("Namey McNameface");
		newPerson2.setRole(Role.ADVISOR);
		newPerson2.setStatus(PersonStatus.ACTIVE);
		newPerson2.setDomainUsername("namey_" + DateTime.now().getMillis());
		newPerson2.setPosition(newPos);
		Integer newPerson2Id = graphQLHelper.createObject(admin, "createPerson", "person", "PersonInput",
				newPerson2, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(newPerson2Id).isNotNull();
		newPerson2 = graphQLHelper.getObjectById(admin, "person", FIELDS, newPerson2Id, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(newPerson2.getId()).isNotNull();
		assertThat(newPerson2.getPosition()).isNotNull();
		assertThat(newPerson2.getPosition().getId()).isEqualTo(newPos.getId());
		
		//Change this person w/ a new position, and ensure it gets changed. 
		
		Position newPos2 = new Position();
		newPos2.setType(PositionType.ADVISOR);
		newPos2.setName("A Second Test Position");
		newPos2.setOrganization(org);
		newPos2.setStatus(PositionStatus.ACTIVE);
		Integer newPos2Id = graphQLHelper.createObject(admin, "createPosition", "position", "PositionInput",
				newPos2, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(newPos2Id).isNotNull();
		newPos2 = graphQLHelper.getObjectById(admin, "position", POSITION_FIELDS, newPos2Id, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(newPos2.getId()).isNotNull();
		
		newPerson2.setName("Changey McChangeface");
		newPerson2.setPosition(newPos2);
		//A person cannot change their own position
		thrown.expect(ForbiddenException.class);
		graphQLHelper.updateObject(newPerson2, "updatePerson", "person", "PersonInput", newPerson2);
		
		nrUpdated = graphQLHelper.updateObject(admin, "updatePerson", "person", "PersonInput", newPerson2);
		assertThat(nrUpdated).isEqualTo(1);
		
		retPerson = graphQLHelper.getObjectById(admin, "person", FIELDS, newPerson2.getId(), new GenericType<GraphQLResponse<Person>>() {});
		assertThat(retPerson).isNotNull();
		assertThat(retPerson.getName()).isEqualTo(newPerson2.getName());
		assertThat(retPerson.getPosition()).isNotNull();
		assertThat(retPerson.getPosition().getId()).isEqualTo(newPos2.getId());
		
		//Now newPerson2 who is a super user, should NOT be able to edit newPerson
		//Because they are not in newPerson2's organization. 
		thrown.expect(ForbiddenException.class);
		graphQLHelper.updateObject(newPerson2, "updatePerson", "person", "PersonInput", newPerson);
		
		//Add some scary HTML to newPerson2's profile and ensure it gets stripped out. 
		newPerson2.setBiography("<b>Hello world</b>.  I like script tags! <script>window.alert('hello world')</script>");
		nrUpdated = graphQLHelper.updateObject(admin, "updatePerson", "person", "PersonInput", newPerson2);
		assertThat(nrUpdated).isEqualTo(1);

		retPerson = graphQLHelper.getObjectById(admin, "person", FIELDS, newPerson2.getId(), new GenericType<GraphQLResponse<Person>>() {});
		assertThat(retPerson.getBiography()).contains("<b>Hello world</b>");
		assertThat(retPerson.getBiography()).doesNotContain("<script>window.alert");
	}

	@Test
	public void searchPerson() {
		Person jack = getJackJackson();

		PersonSearchQuery query = new PersonSearchQuery();
		query.setText("bob");

		AnetBeanList<Person> searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(searchResults.getTotalCount()).isGreaterThan(0);
		assertThat(searchResults.getList().stream().filter(p -> p.getName().equals("BOBTOWN, Bob")).findFirst()).isNotEmpty();

		final OrganizationSearchQuery queryOrgs = new OrganizationSearchQuery();
		queryOrgs.setText("EF 1");
		queryOrgs.setType(OrganizationType.ADVISOR_ORG);
		final AnetBeanList<Organization> orgs = graphQLHelper.searchObjects(jack, "organizationList", "query", "OrganizationSearchQueryInput",
				"id shortName", queryOrgs, new GenericType<GraphQLResponse<AnetBeanList<Organization>>>() {});
		assertThat(orgs.getList().size()).isGreaterThan(0);
		Organization org = orgs.getList().stream().filter(o -> o.getShortName().equalsIgnoreCase("EF 1.1")).findFirst().get();

		query.setText(null);
		query.setOrgId(org.getId());
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(searchResults.getList()).isNotEmpty();

		query.setOrgId(null);
		query.setStatus(ImmutableList.of(PersonStatus.INACTIVE));
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(searchResults.getList()).isNotEmpty();
		assertThat(searchResults.getList().stream().filter(p -> p.getStatus() == PersonStatus.INACTIVE).count())
			.isEqualTo(searchResults.getList().size());
		
		//Search with children orgs
		org = orgs.getList().stream().filter(o -> o.getShortName().equalsIgnoreCase("EF 1")).findFirst().get();
		query.setStatus(null);
		query.setOrgId(org.getId());
		//First don't include child orgs and then increase the scope and verify results increase.
		final AnetBeanList<Person> parentOnlyResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});

		query.setIncludeChildOrgs(true);
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(searchResults.getList()).isNotEmpty();
		assertThat(searchResults.getList()).containsAll(parentOnlyResults.getList());

		query.setIncludeChildOrgs(true);
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(searchResults.getList()).isNotEmpty();

		query.setOrgId(null);
		query.setText("advisor"); //Search against biographies
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(searchResults.getList().size()).isGreaterThan(1);

		query.setText(null);
		query.setRole(Role.ADVISOR);
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(searchResults.getList().size()).isGreaterThan(1);
		
		query.setRole(null);
		query.setText("e");
		query.setSortBy(PersonSearchSortBy.NAME);
		query.setSortOrder(SortOrder.DESC); 
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		String prevName = null;
		for (Person p : searchResults.getList()) { 
			if (prevName != null) { assertThat(p.getName().compareToIgnoreCase(prevName)).isLessThanOrEqualTo(0); } 
			prevName = p.getName();
		}
		
		//Search for a person with the name "A Dvisor"
		query = new PersonSearchQuery();
		query.setText("A Dvisor");
		query.setRole(Role.ADVISOR);
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		long matchCount = searchResults.getList().stream().filter(p -> p.getName().equals("DVISOR, A")).count();
		assertThat(matchCount).isEqualTo(1);
		
		//Search for same person from an autocomplete box. 
		query.setText("A Dvisor*");
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		matchCount = searchResults.getList().stream().filter(p -> p.getName().equals("DVISOR, A")).count();
		assertThat(matchCount).isEqualTo(1);
		
		
		//Search by email Address
		query.setText("hunter+arthur@dds.mil");
		searchResults = graphQLHelper.searchObjects(jack, "personList", "query", "PersonSearchQueryInput",
				FIELDS, query, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		matchCount = searchResults.getList().stream().filter(p -> p.getEmailAddress().equals("hunter+arthur@dds.mil")).count();
		assertThat(matchCount).isEqualTo(1);
		//TODO: should we enforce that this query returns ONLY arthur?  I think not since we're using the plus addressing for testing.. 

	}
	
	@Test
	public void getAllPeopleTest() { 
		Person liz = getElizabethElizawell();
		
		AnetBeanList<Person> results = graphQLHelper.getAllObjects(liz, "people",
				FIELDS, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(results.getTotalCount()).isGreaterThan(0);
		
		AnetBeanList<Person> pageOne = graphQLHelper.getAllObjects(liz, "people (pageNum: 0, pageSize: 2)",
				FIELDS, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(pageOne.getTotalCount()).isEqualTo(results.getTotalCount());
		assertThat(pageOne.getList().size()).isEqualTo(2);
		assertThat(results.getList()).containsAll(pageOne.getList());
		
		AnetBeanList<Person> pageTwo = graphQLHelper.getAllObjects(liz, "people (pageNum: 1, pageSize: 2)",
				FIELDS, new GenericType<GraphQLResponse<AnetBeanList<Person>>>() {});
		assertThat(pageTwo.getTotalCount()).isEqualTo(results.getTotalCount());
		assertThat(pageTwo.getList().size()).isEqualTo(2);
		assertThat(results.getList()).containsAll(pageTwo.getList());
		assertThat(pageOne.getList()).doesNotContainAnyElementsOf(pageTwo.getList());
		
	}
	
	@Test
	public void mergePeopleTest() { 
		//Create a person
		Person loser = new Person();
		loser.setRole(Role.ADVISOR);
		loser.setName("Loser for Merging");
		Integer loserId = graphQLHelper.createObject(admin, "createPerson", "person", "PersonInput",
				loser, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(loserId).isNotNull();
		loser = graphQLHelper.getObjectById(admin, "person", FIELDS, loserId, new GenericType<GraphQLResponse<Person>>() {});
		
		//Create a Position
		Position test = new Position();
		test.setName("A Test Position created by mergePeopleTest");
		test.setType(PositionType.ADVISOR);
		test.setStatus(PositionStatus.ACTIVE);
		
		//Assign to an AO
		final Integer aoId = graphQLHelper.createObject(admin, "createOrganization", "organization", "OrganizationInput",
				OrganizationTest.getTestAO(true), new GenericType<GraphQLResponse<Organization>>() {});
		test.setOrganization(Organization.createWithId(aoId));

		Integer createdId = graphQLHelper.createObject(admin, "createPosition", "position", "PositionInput",
				test, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(createdId).isNotNull();
		Position created = graphQLHelper.getObjectById(admin, "position", POSITION_FIELDS, createdId, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(created.getName()).isEqualTo(test.getName());
		
		//Assign the loser into the position
		Map<String, Object> variables = new HashMap<>();
		variables.put("id", created.getId());
		variables.put("person", loser);
		Integer nrUpdated = graphQLHelper.updateObject(admin, "mutation ($id: Int!, $person: PersonInput!) { payload: putPersonInPosition (id: $id, person: $person) }", variables);
		assertThat(nrUpdated).isEqualTo(1);
		
		//Create a second person
		Person winner = new Person();
		winner.setRole(Role.ADVISOR);
		winner.setName("Winner for Merging");
		Integer winnerId = graphQLHelper.createObject(admin, "createPerson", "person", "PersonInput",
				winner, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(winnerId).isNotNull();
		winner = graphQLHelper.getObjectById(admin, "person", FIELDS, winnerId, new GenericType<GraphQLResponse<Person>>() {});

		variables = new HashMap<>();
		variables.put("winnerId", winnerId);
		variables.put("loserId", loserId);
		nrUpdated = graphQLHelper.updateObject(admin, "mutation ($winnerId: Int!, $loserId: Int!) { payload: mergePeople (winnerId: $winnerId, loserId: $loserId) }", variables);
		assertThat(nrUpdated).isEqualTo(1);
		
		//Assert that loser is gone. 
		thrown.expect(NotFoundException.class);
		graphQLHelper.getObjectById(admin, "person", FIELDS, loser.getId(), new GenericType<GraphQLResponse<Person>>() {});
		
		//Assert that the position is empty. 
		Position winnerPos = graphQLHelper.getObjectById(admin, "position", POSITION_FIELDS + " person {" + PERSON_FIELDS + " }", created.getId(), new GenericType<GraphQLResponse<Position>>() {});
		assertThat(winnerPos.getPerson()).isNull();
		
		//Re-create loser and put into the position. 
		loser = new Person();
		loser.setRole(Role.ADVISOR);
		loser.setName("Loser for Merging");
		loserId = graphQLHelper.createObject(admin, "createPerson", "person", "PersonInput",
				loser, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(loserId).isNotNull();
		loser = graphQLHelper.getObjectById(admin, "person", FIELDS, loserId, new GenericType<GraphQLResponse<Person>>() {});

		variables = new HashMap<>();
		variables.put("id", created.getId());
		variables.put("person", loser);
		nrUpdated = graphQLHelper.updateObject(admin, "mutation ($id: Int!, $person: PersonInput!) { payload: putPersonInPosition (id: $id, person: $person) }", variables);
		assertThat(nrUpdated).isEqualTo(1);

		variables = new HashMap<>();
		variables.put("winnerId", winnerId);
		variables.put("loserId", loserId);
		variables.put("copyPosition", true);
		nrUpdated = graphQLHelper.updateObject(admin, "mutation ($winnerId: Int!, $loserId: Int!, $copyPosition: Bool!) { payload: mergePeople (winnerId: $winnerId, loserId: $loserId, copyPosition: $copyPosition) }", variables);
		assertThat(nrUpdated).isEqualTo(1);
		
		//Assert that loser is gone. 
		thrown.expect(NotFoundException.class);
		graphQLHelper.getObjectById(admin, "person", FIELDS, loser.getId(), new GenericType<GraphQLResponse<Person>>() {});
		
		//Assert that the winner is in the position. 
		winnerPos = graphQLHelper.getObjectById(admin, "position", POSITION_FIELDS + " person {" + PERSON_FIELDS + " }", created.getId(), new GenericType<GraphQLResponse<Position>>() {});
		assertThat(winnerPos.getPerson()).isEqualTo(winner);
		
		
	}

	@Test
	public void testInactivatePerson() {
		final Person jack = getJackJackson();
		final OrganizationSearchQuery query = new OrganizationSearchQuery();
		query.setText("EF 6");
		query.setType(OrganizationType.ADVISOR_ORG);
		final AnetBeanList<Organization> orgs = graphQLHelper.searchObjects(jack, "organizationList", "query", "OrganizationSearchQueryInput",
				"id shortName", query, new GenericType<GraphQLResponse<AnetBeanList<Organization>>>() {});
		assertThat(orgs.getList().size()).isGreaterThan(0);
		final Organization org = orgs.getList().stream().filter(o -> o.getShortName().equalsIgnoreCase("EF 6")).findFirst().get();
		assertThat(org.getId()).isNotNull();

		final Position newPos = new Position();
		newPos.setType(PositionType.ADVISOR);
		newPos.setName("Test Position");
		newPos.setOrganization(org);
		newPos.setStatus(PositionStatus.ACTIVE);
		Integer retPosId = graphQLHelper.createObject(admin, "createPosition", "position", "PositionInput",
				newPos, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(retPosId).isNotNull();
		Position retPos = graphQLHelper.getObjectById(admin, "position", POSITION_FIELDS, retPosId, new GenericType<GraphQLResponse<Position>>() {});
		assertThat(retPos.getId()).isNotNull();

		final Person newPerson = new Person();
		newPerson.setName("Namey McNameface");
		newPerson.setRole(Role.ADVISOR);
		newPerson.setStatus(PersonStatus.ACTIVE);
		newPerson.setDomainUsername("namey_" + DateTime.now().getMillis());
		newPerson.setPosition(retPos);
		Integer retPersonId = graphQLHelper.createObject(admin, "createPerson", "person", "PersonInput",
				newPerson, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(retPersonId).isNotNull();
		Person retPerson = graphQLHelper.getObjectById(admin, "person", FIELDS, retPersonId, new GenericType<GraphQLResponse<Person>>() {});
		assertThat(retPerson.getId()).isNotNull();
		assertThat(retPerson.getPosition()).isNotNull();

		retPerson.setStatus(PersonStatus.INACTIVE);
		Integer nrUpdated = graphQLHelper.updateObject(admin, "updatePerson", "person", "PersonInput", retPerson);
		assertThat(nrUpdated).isEqualTo(1);

		final Person retPerson2 = graphQLHelper.getObjectById(admin, "person", FIELDS, retPerson.getId(), new GenericType<GraphQLResponse<Person>>() {});
		assertThat(retPerson2.getDomainUsername()).isNull();
		assertThat(retPerson2.getPosition()).isNull();
	}
}
