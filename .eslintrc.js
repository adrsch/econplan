module.exports = {
  "extends": ["airbnb"],
  "plugins": ["react"],
  "rules": {
    "react/jsx-filename-extension": [
      1,
      {
        "extensions": [".js", "jsx"]
      }
   ],
  },
  "env": {
    "browser": true
  },
  "settings": {
    "import/resolver": {
      "webpack": {
        "config": "./config/webpack-common-config.js"
      }
    }
  }
}
