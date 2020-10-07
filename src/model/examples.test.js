import { createEconomy } from './economy';
import examples from './examples';
import { defaults } from './config';

test('adding a resource produces a valid schema', () => {
  const econ = createEconomy(examples[0].model);
  return econ.addResource().then(() => (
    econ.schema().isValid(econ.model).then(valid => 
      expect(valid).toBe(true))));
});

test('removing a nonexistant resource leaves model unchanged', () => {
  const econ = createEconomy(examples[0].model);
  econ.removeResource('nothing');
  expect(econ.model).toMatchObject(examples[0].model);
});

test('adding two resources without renaming the first produces a valid schema', () => {
  const econ = createEconomy(examples[0].model);
  return econ.addResource().then(() => (
    econ.addResource().then(() => (
      econ.schema().isValid(econ.model).then(valid => 
        expect(valid).toBe(true))))));
});

test('adding a resource then removing it leaves model unchanged', () => {
  const econ = createEconomy(examples[0].model);
  econ.addResource().then(() => {
    econ.removeResource(defaults.resource);
    expect(econ.model).toMatchObject(examples[0].model);
  });
});

test('adding a resource then renaming it then removing it leaves model unchanged', () => {
  const econ = createEconomy(examples[0].model);
  econ.addResource().then(() => {
    econ.renameResource(defaults.resource, 'test');
    econ.removeResource('test');
    expect(econ.model).toMatchObject(examples[0].model);
  });
});
