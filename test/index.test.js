const path = require('path');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const fs = require('fs-extra');

const plugin = require('../src/index.js');
const { SERVICE_URL, OUTPUT_TEMPLATE } = require('../src/constants');

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

  it('should load the inline UML correctly with plugin config', async () => {
    const customService = 'http://localhost/svg';
    const customConfig = [
      'skinparam defaultFontName Arial',
      'skinparam defaultFontSize 14',
    ];
    mock.config = {
      get(property) {
        if (property === 'pluginsConfig.plantuml-svg.serviceUrl') {
          return customService;
        }
        return customConfig;
      },
    };

    const data = await plugin.blocks.uml.process.call(mock, {
      body: UML_CONTENT,
    });

    expect(data).to.equal(OUTPUT_TEMPLATE(RESULT_BASE64));
    expect(mock.readFileAsString).has.not.been.called;
    expect(mock.rpMock.post).has.been.calledOnce.calledWith({
      url: customService,
      qs: { config: customConfig },
      useQuerystring: true,
      body: UML_CONTENT.trim(),
    });
  });

  it('should throw if the PlantUML block is not found', async () => {
    let error = null;

    await plugin.blocks.uml.process.call(mock, { body: '' }).catch(e => {
      error = e;
    });

    expect(error).to.exist;
    expect(error.message).to.equal('Invalid PlantUML content');
  });

  it('should load the standalone UML correctly', async () => {
    const src = path.join(__dirname, 'data.puml');
    const relPath = path.relative('.', src);
    const data = await plugin.blocks.uml.process.call(mock, {
      kwargs: { src },
    });

    expect(data).to.equal(OUTPUT_TEMPLATE(RESULT_BASE64));
    expect(mock.readFileAsString).has.been.calledOnce.calledWith(relPath);
    expect(mock.rpMock.post).has.been.calledOnce.calledWith({
      url: SERVICE_URL,
      body: (await fs.readFile(src, 'utf8')).trim(),
    });
  });

  it('should load the standalone UML relative to pwd', async () => {
    const src = './data.puml';
    const absPath = path.join(__dirname, src);
    const data = await plugin.blocks.uml.process.call(mock, {
      kwargs: {
        src,
        relativeTo: { path: __filename },
      },
    });

    expect(data).to.equal(OUTPUT_TEMPLATE(RESULT_BASE64));
    expect(mock.readFileAsString).has.been.calledOnce.calledWith(
      path.relative('.', absPath)
    );
    expect(mock.rpMock.post).has.been.calledOnce.calledWith({
      url: SERVICE_URL,
      body: (await fs.readFile(absPath, 'utf8')).trim(),
    });
  });
});
