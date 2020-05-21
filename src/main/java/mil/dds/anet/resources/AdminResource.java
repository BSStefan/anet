package mil.dds.anet.resources;

import com.codahale.metrics.annotation.Timed;
import io.leangen.graphql.annotations.GraphQLArgument;
import io.leangen.graphql.annotations.GraphQLMutation;
import io.leangen.graphql.annotations.GraphQLQuery;
import io.leangen.graphql.annotations.GraphQLRootContext;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.AdminSetting;
import mil.dds.anet.beans.Person;
import mil.dds.anet.config.AnetConfiguration;
import mil.dds.anet.database.AdminDao;
import mil.dds.anet.utils.AnetAuditLogger;
import mil.dds.anet.utils.AuthUtils;
import mil.dds.anet.utils.DaoUtils;
import org.yaml.snakeyaml.Yaml;

@Path("/api/admin")
public class AdminResource {

  private final AdminDao dao;
  private final AnetConfiguration config;

  public AdminResource(AnetObjectEngine engine, AnetConfiguration config) {
    this.dao = engine.getAdminDao();
    this.config = config;
  }

  @GraphQLQuery(name = "adminSettings")
  public List<AdminSetting> getAll() {
    return dao.getAllSettings();
  }

  @GraphQLMutation(name = "saveAdminSettings")
  public Integer saveAdminSettings(@GraphQLRootContext Map<String, Object> context,
      @GraphQLArgument(name = "settings") List<AdminSetting> settings) {
    final Person user = DaoUtils.getUserFromContext(context);
    AuthUtils.assertAdministrator(user);
    int numRows = 0;
    for (AdminSetting setting : settings) {
      numRows += dao.saveSetting(setting);
    }
    AnetAuditLogger.log("Admin settings updated by {}", user);
    return numRows;
  }

  @GET
  @Timed
  @Path("/dictionary")
  @Produces(MediaType.APPLICATION_JSON)
  public Map<String, Object> getDictionary() {
    return config.getDictionary();
  }

  @GraphQLQuery(name = "reloadDictionary")
  public Map<String, Object> reloadDictionary(@GraphQLRootContext Map<String, Object> context) {
    final Person user = DaoUtils.getUserFromContext(context);
    AuthUtils.assertAdministrator(user);
    config.loadDictionary();
    AnetAuditLogger.log("Dictionary updated by {}", user);
    return config.getDictionary();
  }

  @GraphQLQuery(name = "clearCache")
  public String clearCache(@GraphQLRootContext Map<String, Object> context) {
    final Person user = DaoUtils.getUserFromContext(context);
    AuthUtils.assertAdministrator(user);
    return AnetObjectEngine.getInstance().getPersonDao().clearCache();
  }

  /**
   * Returns the project version saved during the gradle build time
   */
  @GraphQLQuery(name = "projectVersion")
  public String getProjectVersion() {
    Yaml yaml = new Yaml();
    InputStream in = AdminResource.class.getResourceAsStream("/version.properties");
    Properties prop = new Properties();
    try {
      prop.load(in);
    } catch (IOException e) {
      return "";
    }
    return prop.getProperty("version");
  }

  /**
   * Returns the up-to-date project version on Github
   */
  @GraphQLQuery(name = "uptodateVersion")
  public String getProjectGitVersion() {
    String version = "";
    try {
      String command = "git describe";
      Process p = null;
      p = Runtime.getRuntime().exec(command);
      BufferedReader input = new BufferedReader(new InputStreamReader(p.getInputStream()));
      version = input.readLine();
    } catch (IOException e) {
      return "";
    }
    return version;
  }

}
