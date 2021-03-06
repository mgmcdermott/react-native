/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';
import type {PropTypeShape} from '../../CodegenSchema';

function upperCaseFirst(inString: string): string {
  return inString[0].toUpperCase() + inString.slice(1);
}

function toSafeCppString(input: string): string {
  return input
    .split('-')
    .map(upperCaseFirst)
    .join('');
}

function getCppTypeForAnnotation(
  type:
    | 'BooleanTypeAnnotation'
    | 'StringTypeAnnotation'
    | 'Int32TypeAnnotation'
    | 'DoubleTypeAnnotation'
    | 'FloatTypeAnnotation',
): string {
  switch (type) {
    case 'BooleanTypeAnnotation':
      return 'bool';
    case 'StringTypeAnnotation':
      return 'std::string';
    case 'Int32TypeAnnotation':
      return 'int';
    case 'DoubleTypeAnnotation':
      return 'double';
    case 'FloatTypeAnnotation':
      return 'Float';
    default:
      (type: empty);
      throw new Error(`Received invalid typeAnnotation ${type}`);
  }
}

function getImports(properties: $ReadOnlyArray<PropTypeShape>): Set<string> {
  const imports: Set<string> = new Set();

  function addImportsForNativeName(name) {
    switch (name) {
      case 'ColorPrimitive':
        return;
      case 'PointPrimitive':
        return;
      case 'ImageSourcePrimitive':
        imports.add('#include <react/components/image/conversions.h>');
        return;
      default:
        (name: empty);
        throw new Error(`Invalid name, got ${name}`);
    }
  }

  properties.forEach(prop => {
    const typeAnnotation = prop.typeAnnotation;

    if (typeAnnotation.type === 'NativePrimitiveTypeAnnotation') {
      addImportsForNativeName(typeAnnotation.name);
    }

    if (
      typeAnnotation.type === 'ArrayTypeAnnotation' &&
      typeAnnotation.elementType.type === 'NativePrimitiveTypeAnnotation'
    ) {
      addImportsForNativeName(typeAnnotation.elementType.name);
    }

    if (typeAnnotation.type === 'ObjectTypeAnnotation') {
      const objectImports = getImports(typeAnnotation.properties);
      objectImports.forEach(imports.add, imports);
    }
  });

  return imports;
}

function generateStructName(
  componentName: string,
  parts: $ReadOnlyArray<string> = [],
): string {
  const additional = parts.map(toSafeCppString).join('');
  return `${componentName}${additional}Struct`;
}

function getEnumName(componentName: string, propName: string): string {
  const uppercasedPropName = toSafeCppString(propName);
  return `${componentName}${uppercasedPropName}`;
}

function getEnumMaskName(enumName: string): string {
  return `${enumName}Mask`;
}

function convertDefaultTypeToString(
  componentName: string,
  prop: PropTypeShape,
): string {
  const typeAnnotation = prop.typeAnnotation;
  switch (typeAnnotation.type) {
    case 'BooleanTypeAnnotation':
      return String(typeAnnotation.default);
    case 'StringTypeAnnotation':
      if (typeAnnotation.default == null) {
        return '';
      }
      return `"${typeAnnotation.default}"`;
    case 'Int32TypeAnnotation':
      return String(typeAnnotation.default);
    case 'DoubleTypeAnnotation':
      const defaultDoubleVal = typeAnnotation.default;
      return parseInt(defaultDoubleVal, 10) === defaultDoubleVal
        ? typeAnnotation.default.toFixed(1)
        : String(typeAnnotation.default);
    case 'FloatTypeAnnotation':
      const defaultFloatVal = typeAnnotation.default;
      return parseInt(defaultFloatVal, 10) === defaultFloatVal
        ? typeAnnotation.default.toFixed(1)
        : String(typeAnnotation.default);
    case 'NativePrimitiveTypeAnnotation':
      switch (typeAnnotation.name) {
        case 'ColorPrimitive':
          return '';
        case 'ImageSourcePrimitive':
          return '';
        case 'PointPrimitive':
          return '';
        default:
          (typeAnnotation.name: empty);
          throw new Error('Received unknown NativePrimitiveTypeAnnotation');
      }
    case 'ArrayTypeAnnotation': {
      switch (typeAnnotation.elementType.type) {
        case 'StringEnumTypeAnnotation':
          if (typeAnnotation.elementType.default == null) {
            throw new Error(
              'A default is required for array StringEnumTypeAnnotation',
            );
          }
          const enumName = getEnumName(componentName, prop.name);
          const enumMaskName = getEnumMaskName(enumName);
          const defaultValue = `${enumName}::${toSafeCppString(
            typeAnnotation.elementType.default || '',
          )}`;
          return `static_cast<${enumMaskName}>(${defaultValue})`;
        default:
          return '';
      }
    }
    case 'ObjectTypeAnnotation': {
      return '';
    }
    case 'StringEnumTypeAnnotation':
      return `${getEnumName(componentName, prop.name)}::${toSafeCppString(
        typeAnnotation.default,
      )}`;
    default:
      (typeAnnotation: empty);
      throw new Error('Received invalid typeAnnotation');
  }
}

module.exports = {
  convertDefaultTypeToString,
  getCppTypeForAnnotation,
  getEnumName,
  getEnumMaskName,
  getImports,
  toSafeCppString,
  generateStructName,
};
