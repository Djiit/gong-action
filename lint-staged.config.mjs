export default {
  "src/**/*.ts": (files) => "npm run build",
  "action.yml": (files) => "auto-doc --filename action.yml",
};
