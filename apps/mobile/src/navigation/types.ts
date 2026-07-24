import type { NavigatorScreenParams } from "@react-navigation/native";
import type { Application } from "@job-tracker/core";

export type DashboardStackParamList = {
  DashboardMain: undefined;
  AddApplication: { application?: Application; mode?: "edit" } | undefined;
  ApplicationDetail: { applicationId: string; application: Application };
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  CalendarTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
};
