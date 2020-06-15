package mil.dds.anet.views;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.common.net.HttpHeaders;
import java.io.IOException;
import java.lang.invoke.MethodHandles;
import java.security.Principal;
import java.util.Set;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.HttpMethod;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerResponseContext;
import javax.ws.rs.container.ContainerResponseFilter;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.SecurityContext;
import mil.dds.anet.config.AnetConfiguration;
import org.eclipse.jetty.security.DefaultUserIdentity;
import org.eclipse.jetty.security.UserAuthentication;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.UserIdentity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ViewResponseFilter implements ContainerResponseFilter {

  private static final Logger logger =
      LoggerFactory.getLogger(MethodHandles.lookup().lookupClass());

  @Context
  HttpServletRequest request;

  AnetConfiguration config;
  private static final Set<MediaType> uncachedMediaTypes =
      ImmutableSet.of(MediaType.APPLICATION_JSON_TYPE, MediaType.TEXT_HTML_TYPE);

  public ViewResponseFilter(AnetConfiguration config) {
    this.config = config;
  }

  @Override
  public void filter(ContainerRequestContext requestContext,
      ContainerResponseContext responseContext) throws IOException {
    // Don't cache requests other than GET, and don't cache selected media types
    final MediaType mediaType = responseContext.getMediaType();
    if (!HttpMethod.GET.equals(requestContext.getMethod()) || mediaType == null
        || uncachedMediaTypes.stream().anyMatch(mt -> mt.equals(mediaType))) {
      responseContext.getHeaders().put(HttpHeaders.CACHE_CONTROL,
          ImmutableList.of("no-store, no-cache, must-revalidate, post-check=0, pre-check=0"));
      responseContext.getHeaders().put(HttpHeaders.PRAGMA, ImmutableList.of("no-cache"));

      // Only POST methods should be logged , otherwise GET methods results with exception
      if (!HttpMethod.GET.equals(requestContext.getMethod())) {

        // This code snippet resolves the situation that caused empty user information to be written
        // to the access.log file
        // Start
        Request baseRequest = Request.getBaseRequest(request);
        Principal userPrincipal = new Principal() {
          @Override
          public String getName() {
            final SecurityContext secContext = requestContext.getSecurityContext();
            Principal p = secContext.getUserPrincipal();
            return p.getName();
          }
        };
        UserIdentity userId = new DefaultUserIdentity(null, userPrincipal, null);
        baseRequest.setAuthentication(new UserAuthentication(null, userId));
        // End

        // Log necessary information into userActivities.log file
        logger.info("\"ip\": \"{}\" , \"user\": \"{}\" , \"referer\": \"{}\"",
            request.getRemoteAddr(), userPrincipal.getName(),
            requestContext.getHeaderString("referer"));
      }
    } else {
      responseContext.getHeaders().put(HttpHeaders.CACHE_CONTROL,
          ImmutableList.of("max-age=259200, public"));
    }
  }

}
