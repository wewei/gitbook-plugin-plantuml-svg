const path = require('path');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const fs = require('fs-extra');

const plugin = require('../index.js');
const { SERVICE_URL, OUTPUT_TEMPLATE } = require('../constants');

chai.use(sinonChai);
const { expect } = chai;

/* eslint-disable no-unused-expressions */

const UML_CONTENT = `
@startuml
some-fake-content
@enduml
`;

const RESULT_BASE64 = 'PHN2Zz48L3N2Zz4=';

describe('GitBook PlantUML Plugin', () => {
  let mock = null;

  beforeEach(() => {
    mock = {
      readFileAsString: sinon.spy(name => fs.readFile(name, 'utf8')),
      rpMock: {
        post: sinon.spy(() => Promise.resolve('<svg></svg>')),
      },
      resolve: path.resolve,
    };
  });

  it('should define the plugin in right structure', () => {
    expect(plugin.blocks).to.exist;
    expect(plugin.blocks.uml).to.exist;
    expect(plugin.blocks.uml.process).to.be.a('function');
  });

  it('should load the inline UML correctly', async () => {
    const data = await plugin.blocks.uml.process.call(mock, {
      body: UML_CONTENT,
    });

    expect(data).to.equal(OUTPUT_TEMPLATE(RESULT_BASE64));
    expect(mock.readFileAsString).has.not.been.called;
    expect(mock.rpMock.post).has.been.calledOnce.calledWith({
      url: SERVICE_URL,
      body: UML_CONTENT.trim(),
    });
  });

  it('should load the standalone UML correctly', async () => {
    const src = path.join(__dirname, 'data.puml');
    const data = await plugin.blocks.uml.process.call(mock, {
      kwargs: { src },
    });

    expect(data).to.equal(OUTPUT_TEMPLATE(RESULT_BASE64));
    expect(mock.readFileAsString).has.been.calledOnce.calledWith(path.relative('.', src));
    expect(mock.rpMock.post).has.been.calledOnce.calledWith({
      url: SERVICE_URL,
      body: (await fs.readFile(src, 'utf8')).trim(),
    });
  });
});
