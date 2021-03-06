import * as yup from 'yup';
import {defaults} from './config';

const generateSchema = (model) => {
  const resources = Object.keys(model.resources[0]);
  const products = Object.keys(model.production);
  const years = model.targets.length;
  return yup.object().shape({
    resources: yup.array().min(years).max(years).of(
      yup.object().shape(
       resources.reduce((acc, cur) => ({ ...acc, [cur]: yup.number().required() }), {}))
    ),
    production: yup.object().shape(
      products.reduce((acc, cur) => ({
        ...acc,
        [cur]: yup.object().shape({
          inputs: yup.object().shape({
            ...products.reduce((acc, cur) => ({ ...acc, [cur]: yup.number().required() }), {}),
            ...resources.reduce((acc, cur) => ({ ...acc, [cur]: yup.number().required() }), {}),
          }),
          capitalStocks: yup.object().shape(
            products.reduce((acc, cur) => ({ ...acc, [cur]: yup.number().required() }), {})
          ),
          depreciation: yup.object().shape(
            products.reduce((acc, cur) => ({ ...acc, [cur]: yup.number().required() }), {})
          ),
          output: yup.number(),
        }),
      }), {})),
    targets: yup.array().min(years).max(years).of(yup.object().shape(
      products.reduce((acc, cur) => ({ ...acc, [cur]: yup.number().required() }), {})
    )),
  });
};

// Name methods

// Key is not the same as a resource key
const resourceNameUnused = (key, model) => Promise.all(
  model.resources.map((year) => new Promise((resolve, reject) => {
    if (year[key] !== undefined) {
      reject('Has the same name as a resource');
    } else {
      resolve();
    }
  })));

// Key is not the same as a product key
const productNameUnused = (key, model) => Promise.all(
  Object.keys(model.production).map((productKey) => new Promise((resolve, reject) => {
    if (productKey === key) {
      reject('Has the same name as a product');
    } else {
      resolve();
    }
  })));

// Name is valid for a new resource/product
const nameValid = (key, model) => Promise.all([
  yup.string().required().isValid(key),
  resourceNameUnused(key, model),
  productNameUnused(key, model),
]);

// Pass a name to get a promise for one which is unused, ie myName3 if myName2 is taken
const getUnusedName = (originalKey, model, tryNumber = 0) => new Promise((resolve, reject) => {
  const newKey = (tryNumber === 0) ? originalKey : `${originalKey}${tryNumber}`;
  nameValid(newKey, model)
    .then(() => resolve(newKey))
    .catch(() => getUnusedName(originalKey, model, tryNumber + 1).then((finalKey) => resolve(finalKey)));
});

// Resources

// List of availability per year
const getResourceYearlyAvailability = (model, getKey) => model.resources.map((year) => year[getKey]);

const createResourceYearlyAvailability = (model) => model.resources.map((year) => 0);

// Map of product key to production input of resource
const getResourceProductionInput = (model, resourceKey) => Object.keys(model.production)
  .reduce((acc, cur) => ({ ...acc, [cur]: model.production[cur].inputs[resourceKey] }), {});

const createResourceProductionInput = (model) => Object.keys(model.production)
  .reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {});

// Resource add/remove/rename methods

const addResource = (model, addKey, yearlyAvailability, resourceProductionInput) => {
  for (let year = 0; year < yearlyAvailability.length; year++) {
    model.resources[year] = ({ ...model.resources[year], [addKey]: yearlyAvailability[year] });
  }
  Object.keys(model.production).forEach((productKey) => {
    model.production[productKey].inputs[addKey] = resourceProductionInput[productKey];
  });
};

const removeResource = (model, deleteKey) => {
  model.resources.forEach((year) => {
    delete year[deleteKey];
  });
  Object.keys(model.production).forEach((productKey) => {
    delete model.production[productKey].inputs[deleteKey];
  });
};

const renameResource = (model, oldKey, newKey) => {
  addResource(
    model,
    newKey,
    getResourceYearlyAvailability(model, oldKey),
    getResourceProductionInput(model, oldKey),
  );
  removeResource(model, oldKey);
}

// Products

// List of product targets for each year
const getProductYearlyTargets = (model, getKey) => model.targets.map((year) => year[getKey]);

const createProductYearlyTargets = (model) => model.targets.map((year) => 0);

// Object of production techniques split into self and other
const getProductTechniques = (model, getKey) => ({
  self: {
    inputs: model.production[getKey].inputs[getKey],
    capitalStocks: model.production[getKey].capitalStocks[getKey],
    depreciation: model.production[getKey].depreciation[getKey],
    output: model.production[getKey].output,
    other: {
      inputs: Object.keys(model.production[getKey].inputs)
        .reduce((acc, cur) => (
          (cur === getKey) ? acc : { ...acc, [cur]: model.production[getKey].inputs[cur] }
        ), {}),
      capitalStocks: Object.keys(model.production[getKey].capitalStocks)
        .reduce((acc, cur) => (
          (cur === getKey) ? acc : { ...acc, [cur]: model.production[getKey].capitalStocks[cur] }
        ), {}),
      depreciation: Object.keys(model.production[getKey].depreciation)
        .reduce((acc, cur) => (
          (cur === getKey) ? acc : { ...acc, [cur]: model.production[getKey].depreciation[cur] }
        ), {}),
    },
  },
  other: Object.keys(model.production)
    .reduce((acc, cur) => (
      (cur === getKey) ? acc : { ...acc, [cur]: {
        inputs: model.production[cur].inputs[getKey],
        capitalStocks: model.production[cur].inputs[getKey],
        depreciation: model.production[cur].depreciation[getKey],
      }}), {}),
});

const createProductTechniques = (model) => ({
  self: {
    inputs: 0,
    capitalStocks: 0,
    depreciation: 0,
    output: 0,
    other: {
      inputs: [...Object.keys(model.production), ...Object.keys(model.resources[0])]
        .reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {}),
      capitalStocks: Object.keys(model.production)
        .reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {}),
      depreciation: Object.keys(model.production)
        .reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {}),
    },
  other: Object.keys(model.production)
    .reduce((acc, cur) => ({ ...acc, [cur]: {
      inputs: 0,
      capitalStocks: 0,
      depreciation: 0,
    }}), {}),
  },
});

// Add/remove/rename methods

const addProduct = (model, addKey, yearlyTargets, techniques) => {
  for (let year = 0; year < yearlyTargets.length; year++) {
    model.targets[year] = ({ ...model.targets[year], [addKey]: yearlyTargets[year] });
  }
  model.production = {
    [addKey]: {
      inputs: {
        [addKey]: techniques.self.inputs,
        ...techniques.self.other.inputs,
      },
      capitalStocks: {
        [addKey]: techniques.self.capitalStocks,
        ...techniques.self.other.capitalStocks,
      },
      depreciation: {
        [addKey]: techniques.self.depreciation,
        ...techniques.self.other.depreciation,
      },
      output: techniques.self.output,
    },
    ...Object.keys(model.production).reduce((acc, cur) => ({ ...acc, [cur]: {
      inputs: {
        [addKey]: techniques.other.inputs[cur],
        ...model.production[cur].inputs,
      },
      capitalStocks: {
        [addKey]: techniques.other.capitalStocks[cur],
        ...model.production[cur].capitalStocks,
      },
      depreciation: {
        [addKey]: techniques.other.depreciation[cur],
        ...model.production[cur].depreciation,
      },
      output: model.production[cur].output,
    }}), {}),
  };
};

const removeProduct = (model, deleteKey) => {
  delete model.production[deleteKey];
  Object.keys(model.production).forEach((productKey) => {
    delete model.production[productKey].inputs[deleteKey];
    delete model.production[productKey].capitalStocks[deleteKey];
    delete model.production[productKey].depreciation[deleteKey];
  });
  model.targets.forEach((year) => {
    delete year[deleteKey];
  });
};

const renameProduct = (model, oldKey, newKey) => {
  addProduct(
    model,
    newKey,
    getProductYearlyTargets(model, oldkey),
    getProductTechniques(model, oldKey),
  );
  removeProduct(model, oldKey);
};

const economy = ({
  schema: function() { return generateSchema(this); },
  addResource: function() {
    return getUnusedName(defaults.resource, this)
      .then((resourceKey) => addResource(
        this,
        resourceKey,
        createResourceYearlyAvailability(this),
        createResourceProductionInput(this),
      ));
  },
  removeResource: function(resourceKey) { removeResource(this, resourceKey); },
  renameResource: function(oldKey, newKey) { renameResource(this, oldKey, newKey); },
  addProduct: function() {
    return getUnusedName(defaults.product, this)
      .then((productKey) => addResource(
        this,
        productKey,
        createProductYearlyTargets(this),
        createProductTechniques(this),
      ));
  },
  removeProduct: function(productKey) { removeProduct(this, productKey); },
  renameProduct: function(oldKey, newKey) { renameProduct(this, oldKey, newKey); },
});

const createEconomy = (model) =>
  Object.assign(Object.create(economy), model);


export { generateSchema, createEconomy };
