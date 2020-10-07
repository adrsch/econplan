import React from "react";
import { hot } from "react-hot-loader";

import * as yup from 'yup';
import { createEconomy, generateSchema } from './model/economy';
import examples from './model/examples';

import style from "./app.scss";

const App = () => {
  const model = examples[0].model;
  const econ = createEconomy(model);
  econ.addResource();
  setTimeout(() => {
  //econ.addResource();
  //econ.renameResource('resource', 'asdr');
  //econ.removeResource('ff');
  setTimeout(() => {
  econ.schema().validate(econ.model)
    .then((val) => console.log(val))
    .catch((err) => console.log(err));
  }, 300);
  }, 300);
  //addResource(model);
  return <div className={style.app}>react Starter 🚀 </div>;
};

export default hot(module)(App);
