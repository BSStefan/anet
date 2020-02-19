package mil.dds.anet.test.integration.utils;

import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import javax.mail.Authenticator;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import mil.dds.anet.config.AnetConfiguration.SmtpConfiguration;
import mil.dds.anet.test.integration.config.AnetTestConfiguration;
import mil.dds.anet.utils.Utils;
import org.apache.commons.io.IOUtils;
import org.json.JSONArray;

/**
 * This class provides a wrapper for the fake SMTP server's API.
 */
public class FakeSmtpServer {

  private final String smtpIP;
  private final String smtpPort;
  private final String smtpUsername;
  private final String smtpPassword;
  private final String sslTrust;
  private final String startTls;
  private final String httpIP;
  private final String httpPort;

  private final int waitBeforeActionMs;
  private final int maxRetriesClear;

  public FakeSmtpServer(SmtpConfiguration smtpConfig) throws Exception {
    smtpIP = smtpConfig.getHostname();
    smtpPort = Integer.toString(smtpConfig.getPort());
    smtpUsername = smtpConfig.getUsername();
    smtpPassword = smtpConfig.getPassword();
    sslTrust = smtpConfig.getSslTrust();
    startTls = Boolean.toString(smtpConfig.getStartTls());
    httpIP = smtpConfig.getHostname();

    // Not in config
    httpPort = System.getenv("ANET_SMTP_HTTP_PORT");

    // A system variable is required to run this test
    if (httpPort == null) {
      fail("'ANET_SMTP_HTTP_PORT' system environment variable not found.");
    }

    // Read from test config
    waitBeforeActionMs = Integer
        .parseInt(AnetTestConfiguration.getConfiguration().get("emailWaitBeforeAction").toString());
    maxRetriesClear = Integer.parseInt(
        AnetTestConfiguration.getConfiguration().get("emailMaxWaitRetriesOnClear").toString());

    clearEmailServer();
  }

  /**
   * Retrieves all emails from the server.
   * 
   * @return All emails from the server
   * @throws IOException If the request fails
   * @throws InterruptedException If the wait timer fails
   */
  public List<EmailResponse> requestAllEmailsFromServer() throws IOException, InterruptedException {
    TimeUnit.MILLISECONDS.sleep(waitBeforeActionMs);

    return requestEmailsFromServer(new QueryFilter());
  }

  /**
   * Retrieves all emails from the server according to a filter.
   * 
   * @param queryFilter The filter to use
   * @return All filtered emails from the server
   * @throws IOException If the request fails
   * @throws InterruptedException If the wait timer fails
   */
  public List<EmailResponse> requestEmailsFromServer(QueryFilter queryFilter)
      throws IOException, InterruptedException {
    TimeUnit.MILLISECONDS.sleep(waitBeforeActionMs);

    final String request = queryFilter.createFilteredServerQuery(httpIP, httpPort);
    final String response = sendServerRequest(request, "GET");
    System.out.println(response);
    return parseServeResponse(response);
  }

  /**
   * Clears all emails from the server.
   * 
   * @throws Exception If the request or wait timer fails
   */
  public void clearEmailServer() throws Exception {
    TimeUnit.MILLISECONDS.sleep(waitBeforeActionMs);

    final String request = String.format("http://%s:%s/api/emails", httpIP, httpPort);

    sendServerRequest(request, "DELETE");

    for (int i = 0; i < maxRetriesClear; i++) {
      if (i == maxRetriesClear) {
        throw new Exception("Email server not responding");
      } else if (requestAllEmailsFromServer().size() == 0) {
        break;
      }
    }
  }

  private static List<EmailResponse> parseServeResponse(String serverResponse) {
    final JSONArray response = new JSONArray(serverResponse);
    final List<EmailResponse> emails = new ArrayList<EmailResponse>();

    for (int i = 0; i < response.length(); i++) {
      emails.add(new EmailResponse(response.getJSONObject(i)));
    }

    return emails;
  }

  private String sendServerRequest(String request, String requestType) throws IOException {
    final URL url = new URL(request);
    final HttpURLConnection httpConnection = (HttpURLConnection) url.openConnection();

    if (!Utils.isEmptyOrNull(smtpUsername) || !Utils.isEmptyOrNull(smtpPassword)) {
      final String userpass = smtpUsername + ":" + smtpPassword;
      final String basicAuth =
          "Basic " + new String(Base64.getEncoder().encode(userpass.getBytes()));
      httpConnection.setRequestProperty("Authorization", basicAuth);
    }

    httpConnection.setDoOutput(true);
    httpConnection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
    httpConnection.setRequestProperty("Accept-Charset", StandardCharsets.UTF_8.name());
    httpConnection.setRequestMethod(requestType);
    httpConnection.connect();
    final InputStream response = httpConnection.getInputStream();
    return IOUtils.toString(response, StandardCharsets.UTF_8.name());
  }

  /**
   * Sends an email to the server Warning: The server does not support the BCC field.
   * 
   * @param to 'To' address
   * @param from 'From' address
   * @param replyTo 'ReplyTo' address
   * @param cc 'CC' address
   * @param subject Email's subject
   * @param msg Email's message
   * @param date (Optional) Email's date
   * @throws MessagingException If formatting/sending the email fails
   */
  public void sendEmail(String to, String from, String replyTo, String cc, String subject,
      String msg, Date date) throws MessagingException {
    final Properties properties = System.getProperties();

    properties.setProperty("mail.smtp.host", smtpIP);
    properties.setProperty("mail.smtp.port", smtpPort);
    properties.setProperty("mail.smtp.auth", "false");
    properties.setProperty("mail.smtp.ssl.trust", sslTrust);
    properties.setProperty("mail.smtp.starttls.enable", startTls);

    final Session session = Session.getDefaultInstance(properties, new Authenticator() {

      @Override
      protected PasswordAuthentication getPasswordAuthentication() {
        return new PasswordAuthentication(smtpUsername, smtpPassword);
      }

    });

    final Message message = new MimeMessage(session);
    message.setFrom(new InternetAddress(from));
    message.addRecipient(Message.RecipientType.TO, new InternetAddress(to));

    if (replyTo != null) {
      message.setReplyTo(new InternetAddress[] {new InternetAddress(replyTo)});
    }

    if (cc != null) {
      message.addRecipient(Message.RecipientType.CC, new InternetAddress(cc));
    }

    message.setSubject(subject);
    message.setText(msg);
    message.setSentDate(date == null ? new Date() : date);

    Transport.send(message, message.getAllRecipients());
  }

  /**
   * A filter for the queries to the email server.
   */
  public class QueryFilter {
    public String from = "";
    public String to = "";
    public String since = "";
    public String until = "";

    public QueryFilter withFrom(String value) {
      this.from = "?from=" + value;
      return this;
    }

    public QueryFilter withTo(String value) {
      this.to = "?to=" + value;
      return this;
    }

    public QueryFilter withSince(String value) {
      this.since = "?since=" + value;
      return this;
    }

    public QueryFilter withUntil(String value) {
      this.until = "?until=" + value;
      return this;
    }

    public String createFilteredServerQuery(String serverHost, String serverPort) {
      return String.format("http://%s:%s/api/emails%s%s%s%s", serverHost, serverPort, this.from,
          this.to, this.since, this.until);
    }
  }

}
