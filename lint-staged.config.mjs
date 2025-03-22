export default {
  "src/**/*.js": (files) => "npm run build",
  "action.yml": (files) => "auto-doc --filename action.yml",
};
