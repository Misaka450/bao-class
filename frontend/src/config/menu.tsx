import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  BulbOutlined,
  TableOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

/**
 * Menu configuration following Ant Design Pro conventions
 */

export interface MenuDataItem {
  path: string;
  name: string;
  icon?: React.ReactNode;
  children?: MenuDataItem[];
  hideInMenu?: boolean;
  access?: string[];
}

const menuData: MenuDataItem[] = [
  {
    path: '/dashboard',
    name: '仪表盘',
    icon: <DashboardOutlined />,
  },
  {
    path: '/classes',
    name: '班级管理',
    icon: <TeamOutlined />,
  },
  {
    path: '/students',
    name: '学生管理',
    icon: <UserOutlined />,
  },
  {
    path: '/teaching',
    name: '教学管理',
    icon: <BookOutlined />,
    children: [
      {
        path: '/courses',
        name: '课程管理',
      },
      {
        path: '/exams',
        name: '考试管理',
      },
      {
        path: '/import',
        name: '数据导入',
      },
    ],
  },
  {
    path: '/scores-list',
    name: '成绩清单',
    icon: <TableOutlined />,
  },
  {
    path: '/audit-logs',
    name: '操作日志',
    icon: <SafetyCertificateOutlined />,
  },
  {
    path: '/analysis',
    name: '数据分析',
    icon: <BulbOutlined />,
    children: [
      {
        path: '/analysis/class',
        name: '班级成绩走势',
      },
      {
        path: '/analysis/alerts',
        name: '管理预警',
      },
    ],
  },
];

export default menuData;