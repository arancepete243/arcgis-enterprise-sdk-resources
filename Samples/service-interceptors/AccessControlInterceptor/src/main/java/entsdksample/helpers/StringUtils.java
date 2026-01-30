package entsdksample.helpers;

import java.util.Set;
import java.util.stream.Collectors;

public class StringUtils {
  /**
   * Builds a safe SQL IN clause on STATE_NAME.
   * When the set is empty or null, returns "1=0" to block all rows (fail closed).
   */
  public static String createStateWhereClause(Set<String> stateSet) {
    if (stateSet == null || stateSet.isEmpty()) {
      // No states allowed, block all data
      return "1=0";
    }
    // Escape single quotes in state names to avoid SQL injection errors
    String joinedStates = stateSet.stream()
        .map(s -> "'" + s.replace("'", "''") + "'")
        .collect(Collectors.joining(","));
    return Constants.STATE_FIELD_NAME + " IN (" + joinedStates + ")";
  }

  public static String extractUserName(String userInfo) {
    if (userInfo == null) return "";
    String s = userInfo.trim();
    if (s.isEmpty()) return "";

    int first = s.indexOf("::");
    if (first < 0) {
      // no delimiter — whole string is the username
      return s;
    }

    int start = first + 2; // after first "::"
    int second = s.indexOf("::", start);

    String mid = (second < 0) ? s.substring(start) : s.substring(start, second);
    return mid.trim();
  }

  public static String safeString(String s) {
    return s == null ? "" : s;
  }
}
