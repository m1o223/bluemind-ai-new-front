export function getPreferredAppRoute(sessionOrUser) {
  const preferences = sessionOrUser?.user?.preferences
    || sessionOrUser?.preferences
    || sessionOrUser
    || {};

  return preferences.openAppDirectlyToChat ? "/chat" : "/dashboard";
}
