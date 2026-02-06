module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[value=/[\\u{1F300}-\\u{1F9FF}]/u]",
        message:
          "Emojis are not allowed in production UI. Use branded icons from @/brand/icons instead.",
      },
      {
        selector:
          "TemplateLiteral[quasis.0.value.raw=/[\\u{1F300}-\\u{1F9FF}]/u]",
        message:
          "Emojis are not allowed in production UI. Use branded icons from @/brand/icons instead.",
      },
    ],
  },
};
