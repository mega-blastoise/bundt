export const command = "ssg";
export const description = "Bundle a static site for production with waavy";
export const options = [
  {
    flags: "-v,--verbose",
    description: "Enable verbose output",
    default: false,
  },
];
