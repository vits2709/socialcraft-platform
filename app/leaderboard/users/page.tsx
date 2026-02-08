import { redirect } from "next/navigation";

export default function LeaderboardUsersRedirect() {
  redirect("/leaderboard#users");
}