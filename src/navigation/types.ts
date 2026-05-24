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

// Home tab stack — the letter-writing flow
export type MainStackParamList = {
  Home: undefined;
  PromptPicker: { letterId: string };
  WriteResponse: { letterId: string; promptId: string };
  IntroOutro: { letterId: string; field: 'intro' | 'outro' };
  Preview: { letterId: string };
  Send: { letterId: string };
};

// Letters tab stack
export type LettersStackParamList = {
  Archive: undefined;
  ArchiveRead: { letterId: string };
};

// Settings tab stack
export type SettingsStackParamList = {
  Settings: undefined;
};

// Bottom tab navigator
export type MainTabParamList = {
  HomeTab: undefined;
  LettersTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Setup: undefined;
  Main: undefined;
};
