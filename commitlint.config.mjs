// Dependabot commit bodies embed long release-note URLs and cannot be
// reworded, so they are exempt from the body line-length rule.
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => /^Signed-off-by: dependabot\[bot\]/m.test(message)],
};
