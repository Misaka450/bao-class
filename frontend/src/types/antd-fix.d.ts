/**
 * Temporary type fixes for Ant Design with React 19
 * This will be removed once Ant Design fully supports React 19
 */

declare module 'antd' {
  import { ComponentType } from 'react';
  
  export interface CardProps {
    title?: React.ReactNode;
    className?: string;
    bodyStyle?: React.CSSProperties;
    bordered?: boolean;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  
  export interface SelectProps {
    value?: any;
    onChange?: (value: any) => void;
    placeholder?: string;
    allowClear?: boolean;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  
  export interface OptionProps {
    key?: React.Key;
    value: any;
    children?: React.ReactNode;
  }
  
  export interface ResultProps {
    status?: 'success' | 'error' | 'info' | 'warning' | '404' | '403' | '500';
    title?: React.ReactNode;
    subTitle?: React.ReactNode;
    extra?: React.ReactNode;
  }
  
  export const Card: ComponentType<CardProps>;
  export const Select: ComponentType<SelectProps> & {
    Option: ComponentType<OptionProps>;
  };
  export const Result: ComponentType<ResultProps>;
}