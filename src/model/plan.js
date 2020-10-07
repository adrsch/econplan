import { prefix } from './config';

const glpk = require('hgourvest-glpk');

const objective = (economy) => (
  economy.targets.map((targets, year) => (
    ` + ${prefix.target}${year}`
  )).join('')
);

const yearlyTargetConstraints = (targets, year) => (
  Object.keys(targets).map((product) => (
    ` + ${prefix.target}${year} - ${targets[product] ** -1} ${prefix.finalConsumption}${product}${year}  <= 0`
  ))
);

const targetConstraints = (economy) => (
  economy.targets.map((targets, year) => yearlyTargetConstraints(targets, year))
);

const listFlowsAllProducts = (resource, production, year) => (
  Object.keys(production).map((product) => (
    ` + ${prefix.flow}${resource}${product}${year}`
  )).join('')
);

const yearlyResourceConstraints = (resource, amount, production, year) => [
  ` + ${prefix.resource}${resource}${year} <= ${amount}`,
  ` - ${prefix.resource}${resource}${year} ${listFlowsAllProducts(resource, production, year)} <= 0`,
];

const resourceConstraints = (economy) => (
  economy.resources.map((resources, year) => (
    Object.keys(resources).map((resource) => (
      yearlyResourceConstraints(resource, resources[resource], economy.production, year)
    ))
  ))
);

const yearlyProductOutputFlowConstraints = (product, inputs, output, year) => (
  Object.keys(inputs).filter((input) => inputs[input] !== 0).map((input) => (
    ` + ${prefix.output}${product}${year} - ${output / inputs[input]} ${prefix.flow}${input}${product}${year} <= 0`
  ))
);

const yearlyProductOutputCapitalStockConstraints = (product, capitalStocks, output, year) => (
  Object.keys(capitalStocks).map((stock) => (
    ` + ${prefix.output}${product}${year} - ${output / capitalStocks[stock]} ${prefix.capitalStock}${stock}${product}${year} <= 0`
  ))
);

const yearlyProductStockDepreciationConstraints = (product, capitalStocks, depreciation, year) => (
  Object.keys(capitalStocks).map((stock) => (
    ` + ${prefix.depreciation}${stock}${product}${year} - ${depreciation[stock]} ${prefix.capitalStock}${stock}${product}${year} = 0`
  ))
);

const yearlyProductCapitalStockSizeConstraints = (product, capitalStocks, depreciation, year) => (
  Object.keys(capitalStocks).map((stock) => (
    (year > 0)
      ? ` + ${prefix.capitalStock}${stock}${product}${year} - ${prefix.capitalStock}${stock}${product}${year - 1} - ${prefix.accumulation}${stock}${product}${year - 1} + ${prefix.depreciation}${stock}${product}${year - 1} <= 0`
      : ` + ${prefix.capitalStock}${stock}${product}${year} <= ${capitalStocks[stock]}`
  ))
);

const allProductsForYear = (entryPrefix, product, products, year) => (
  Object.keys(products).map((endProduct) => (
    ` + ${entryPrefix}${product}${endProduct}${year}`
  )).join('')
);

const yearlyProductConsumptionConstraints = (product, products, year) => [
  `${allProductsForYear(prefix.accumulation, product, products, year)} - ${prefix.accumulation}${product}${year} <= 0`,
  `${allProductsForYear(prefix.flow, product, products, year)} - ${prefix.productiveConsumption}${product}${year} <= 0`,
  ` + ${prefix.finalConsumption}${product}${year} - ${prefix.output}${product}${year} + ${prefix.accumulation}${product}${year} + ${prefix.productiveConsumption}${product}${year} <= 0`,
];

const yearlyProductionConstraints = (economy, year) => (
  Object.keys(economy.production).map((product) => [
    yearlyProductOutputFlowConstraints(
      product,
      economy.production[product].inputs,
      economy.production[product].output,
      year,
    ),
    yearlyProductOutputCapitalStockConstraints(
      product,
      economy.production[product].capitalStocks,
      economy.production[product].output,
      year,
    ),
    yearlyProductStockDepreciationConstraints(
      product,
      economy.production[product].capitalStocks,
      economy.production[product].depreciation,
      year,
    ),
    yearlyProductCapitalStockSizeConstraints(
      product,
      economy.production[product].capitalStocks,
      economy.production[product].depreciation,
      year,
    ),
    yearlyProductConsumptionConstraints(
      product,
      economy.production,
      year,
    ),
  ])
);

const productionConstraints = (economy) => (
  economy.targets.map((targets, year) => yearlyProductionConstraints(economy, year))
);


const constraints = (economy) => (
  [
    targetConstraints(economy),
    resourceConstraints(economy),
    productionConstraints(economy),
  ].flat(Infinity)
);

const formatGlpk = (economy) => (`
Maximize
objective: ${objective(economy)}
Subject To
${constraints(economy).join('\n')}
End
`);

// For use externally with lp_solve
const formatLpSolve = (economy) => (`
max: ${objective(economy)};
${constraints(economy).join(';\n')};
`);

const glpkSolve = (lptFormatEconomy) => {
  const lp = glpk.glp_create_prob();
  glpk.glp_read_lp_from_string(lp, null, lptFormatEconomy);
  glpk.glp_scale_prob(lp, glpk.GLP_SF_AUTO);
  const smcp = new glpk.SMCP({ presolve: glpk.GLP_ON });
  glpk.glp_simplex(lp, smcp);
  const iocp = new glpk.IOCP({ presolve: glpk.GLP_ON });
  glpk.glp_intopt(lp, iocp);

  const result = {
    objective: glpk.glp_mip_obj_val(lp),
    values: {},
  };
  for (let i = 1; i <= glpk.glp_get_num_cols(lp); i++) {
    result.values[glpk.glp_get_col_name(lp, i)] = glpk.glp_mip_col_val(lp, i);
  }
  return result;
};

const makePlan = (economy) => glpkSolve(formatGlpk(economy));

export {
  makePlan,
  formatGlpk,
  formatLpSolve,
};
