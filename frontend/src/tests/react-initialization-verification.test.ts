/**
 * React 初始化验证测试
 * 验证 React 和相关库是否正确初始化
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';

describe('React Initialization Verification', () => {
  beforeEach(() => {
    // 清除之前的初始化标记
    delete (window as any).__REACT_INITIALIZATION_START__;
    delete (window as any).__REACT_INITIALIZATION_COMPLETE__;
    delete (window as any).__REACT_ROOT_CREATED__;
  });

  it('should have React available', () => {
    expect(typeof React).toBe('object');
    expect(React).toBeDefined();
  });

  it('should have React.StrictMode available', () => {
    expect(React.StrictMode).toBeDefined();
    expect(typeof React.StrictMode).toBe('object');
  });

  it('should have ReactDOM available', () => {
    expect(typeof ReactDOM).toBe('object');
    expect(ReactDOM).toBeDefined();
  });

  it('should have ReactDOM.createRoot available', () => {
    expect(ReactDOM.createRoot).toBeDefined();
    expect(typeof ReactDOM.createRoot).toBe('function');
  });

  it('should have useEffect available from React', () => {
    const { useEffect } = React;
    expect(useEffect).toBeDefined();
    expect(typeof useEffect).toBe('function');
  });

  it('should have useState available from React', () => {
    const { useState } = React;
    expect(useState).toBeDefined();
    expect(typeof useState).toBe('function');
  });

  it('should have useRef available from React', () => {
    const { useRef } = React;
    expect(useRef).toBeDefined();
    expect(typeof useRef).toBe('function');
  });

  it('should have useCallback available from React', () => {
    const { useCallback } = React;
    expect(useCallback).toBeDefined();
    expect(typeof useCallback).toBe('function');
  });

  it('should have useContext available from React', () => {
    const { useContext } = React;
    expect(useContext).toBeDefined();
    expect(typeof useContext).toBe('function');
  });

  it('should have useReducer available from React', () => {
    const { useReducer } = React;
    expect(useReducer).toBeDefined();
    expect(typeof useReducer).toBe('function');
  });

  it('should have BrowserRouter available from react-router-dom', async () => {
    const { BrowserRouter } = await import('react-router-dom');
    expect(BrowserRouter).toBeDefined();
    expect(typeof BrowserRouter).toBe('function');
  });

  it('should have useLocation available from react-router-dom', async () => {
    const { useLocation } = await import('react-router-dom');
    expect(useLocation).toBeDefined();
    expect(typeof useLocation).toBe('function');
  });

  it('should have useNavigate available from react-router-dom', async () => {
    const { useNavigate } = await import('react-router-dom');
    expect(useNavigate).toBeDefined();
    expect(typeof useNavigate).toBe('function');
  });

  it('should have QueryClientProvider available from @tanstack/react-query', async () => {
    const { QueryClientProvider } = await import('@tanstack/react-query');
    expect(QueryClientProvider).toBeDefined();
    expect(typeof QueryClientProvider).toBe('function');
  });

  it('should have Zustand create available', async () => {
    const { create } = await import('zustand');
    expect(create).toBeDefined();
    expect(typeof create).toBe('function');
  });

  it('should have Ant Design components available', async () => {
    const antd = await import('antd');
    expect(antd.Button).toBeDefined();
    expect(antd.Form).toBeDefined();
    expect(antd.Input).toBeDefined();
    expect(antd.Table).toBeDefined();
  });

  it('should have ProLayout available from @ant-design/pro-layout', async () => {
    const { ProLayout } = await import('@ant-design/pro-layout');
    expect(ProLayout).toBeDefined();
    expect(typeof ProLayout).toBe('function');
  });

  it('should have window object available', () => {
    expect(typeof window).toBe('object');
    expect(window).toBeDefined();
  });

  it('should have document object available', () => {
    expect(typeof document).toBe('object');
    expect(document).toBeDefined();
  });

  it('should have localStorage available', () => {
    expect(typeof localStorage).toBe('object');
    expect(localStorage).toBeDefined();
  });

  it('should be able to set and get localStorage items', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
    localStorage.removeItem('test-key');
  });

  it('should have console available', () => {
    expect(typeof console).toBe('object');
    expect(console).toBeDefined();
    expect(typeof console.log).toBe('function');
    expect(typeof console.error).toBe('function');
    expect(typeof console.warn).toBe('function');
  });

  it('should have setTimeout available', () => {
    expect(typeof setTimeout).toBe('function');
  });

  it('should have setInterval available', () => {
    expect(typeof setInterval).toBe('function');
  });

  it('should have Promise available', () => {
    expect(typeof Promise).toBe('function');
    expect(Promise).toBeDefined();
  });

  it('should have fetch available', () => {
    expect(typeof fetch).toBe('function');
  });

  it('should have JSON available', () => {
    expect(typeof JSON).toBe('object');
    expect(JSON).toBeDefined();
    expect(typeof JSON.parse).toBe('function');
    expect(typeof JSON.stringify).toBe('function');
  });

  it('should be able to parse and stringify JSON', () => {
    const obj = { key: 'value', number: 42 };
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(obj);
  });

  it('should have Array methods available', () => {
    const arr = [1, 2, 3];
    expect(typeof arr.map).toBe('function');
    expect(typeof arr.filter).toBe('function');
    expect(typeof arr.reduce).toBe('function');
    expect(typeof arr.forEach).toBe('function');
  });

  it('should have Object methods available', () => {
    expect(typeof Object.keys).toBe('function');
    expect(typeof Object.values).toBe('function');
    expect(typeof Object.entries).toBe('function');
    expect(typeof Object.assign).toBe('function');
  });

  it('should have String methods available', () => {
    const str = 'test';
    expect(typeof str.split).toBe('function');
    expect(typeof str.replace).toBe('function');
    expect(typeof str.includes).toBe('function');
    expect(typeof str.startsWith).toBe('function');
  });

  it('should have Number methods available', () => {
    expect(typeof Number.isInteger).toBe('function');
    expect(typeof Number.isNaN).toBe('function');
    expect(typeof Number.parseFloat).toBe('function');
    expect(typeof Number.parseInt).toBe('function');
  });

  it('should have Math object available', () => {
    expect(typeof Math).toBe('object');
    expect(Math).toBeDefined();
    expect(typeof Math.floor).toBe('function');
    expect(typeof Math.ceil).toBe('function');
    expect(typeof Math.round).toBe('function');
    expect(typeof Math.random).toBe('function');
  });

  it('should have Date object available', () => {
    expect(typeof Date).toBe('function');
    const date = new Date();
    expect(date).toBeDefined();
    expect(typeof date.getTime).toBe('function');
  });

  it('should have RegExp available', () => {
    expect(typeof RegExp).toBe('function');
    const regex = /test/;
    expect(regex).toBeDefined();
    expect(typeof regex.test).toBe('function');
  });

  it('should have Error available', () => {
    expect(typeof Error).toBe('function');
    const error = new Error('test');
    expect(error).toBeDefined();
    expect(error.message).toBe('test');
  });

  it('should be able to throw and catch errors', () => {
    expect(() => {
      throw new Error('test error');
    }).toThrow('test error');
  });

  it('should have try-catch working', () => {
    let caught = false;
    try {
      throw new Error('test');
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  it('should have async-await working', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should have destructuring working', () => {
    const obj = { a: 1, b: 2 };
    const { a, b } = obj;
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it('should have spread operator working', () => {
    const arr1 = [1, 2];
    const arr2 = [...arr1, 3];
    expect(arr2).toEqual([1, 2, 3]);
  });

  it('should have arrow functions working', () => {
    const fn = (x: number) => x * 2;
    expect(fn(5)).toBe(10);
  });

  it('should have template literals working', () => {
    const name = 'world';
    const greeting = `Hello, ${name}!`;
    expect(greeting).toBe('Hello, world!');
  });

  it('should have classes working', () => {
    class TestClass {
      value: number;
      constructor(value: number) {
        this.value = value;
      }
      getValue() {
        return this.value;
      }
    }
    const instance = new TestClass(42);
    expect(instance.getValue()).toBe(42);
  });

  it('should have modules working', async () => {
    const module = await import('react');
    expect(module).toBeDefined();
    expect(module.default || module.useState).toBeDefined();
  });
});
