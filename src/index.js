'use strict';

const _ = require('lodash');
const path = require('path');
const rp = require('request-promise');
const { Base64 } = require('js-base64');
const { SERVICE_URL, OUTPUT_TEMPLATE } = require('./constants');

function getContentPath(kwargs) {
  const rel = kwargs.relativeTo;
  const basePath = rel ? (_.isString(rel.path) ? path.dirname(rel.path) : rel) : '.';
  const absPath = path.resolve(basePath, kwargs.src);

  return path.relative(this.resolve('.'), absPath);
}

function getConfig(context, property, defaultValue) {
  const config = _.get(context, 'config')
    ? _.get(context, 'config')
    : _.get(context, 'book.config');
  return config ? config.get(property, defaultValue) : defaultValue;
}

function loadUmlContent({ kwargs = {}, body } = {}) {
  if (kwargs.src) {
    return this.readFileAsString(getContentPath.call(this, kwargs));
  }
  return Promise.resolve(body);
}

function trimContent(content) {
  const indexFrom = content.indexOf('@startuml');
  const indexTo = content.lastIndexOf('@enduml') + 7;

  if (indexFrom < 0 || indexTo < 0) {
    throw new Error('Invalid PlantUML content');
  }
  return content.slice(indexFrom, indexTo);
}

function renderUml(content) {
  const params = {
    url: getConfig(this, 'pluginsConfig.plantuml-svg.serviceUrl', SERVICE_URL),
    body: content,
  };

  const config = getConfig(this, 'pluginsConfig.plantuml-svg.config');
  if (config) {
    params.qs = { config };
    params.useQuerystring = true;
  }

  return (this.rpMock || rp)
    .post(params)
    .then(Base64.encode)
    .then(OUTPUT_TEMPLATE);
}

module.exports = {
  blocks: {
    uml: {
      process: function(block) {
        return loadUmlContent
          .call(this, block)
          .then(trimContent)
          .then(renderUml.bind(this));
      },
    },
  },
};
