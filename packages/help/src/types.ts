export type HelpSection = {
  id: string;
  title: string;
  html: string;
  searchText: string;
};

export type HelpContent = {
  title: string;
  subtitle: string;
  sections: HelpSection[];
};
