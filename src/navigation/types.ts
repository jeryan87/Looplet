export type OnboardingStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
};

export type SetupStackParamList = {
  CreateLoop: undefined;
  AddRecipients: { loopId: string };
  SetCadence: { loopId: string };
};

export type MainStackParamList = {
  Home: undefined;
  PromptPicker: { letterId: string };
  WriteResponse: { letterId: string; promptId: string };
  Preview: { letterId: string };
  Send: { letterId: string };
  Archive: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Setup: undefined;
  Main: undefined;
};
