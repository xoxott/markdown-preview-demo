/**
 * 基础使用示例
 * 展示最基本的 API 请求功能
 */

import { createRequest } from '../request';

// 创建请求实例
const request = createRequest(undefined, {
  baseURL: '/api',
  timeout: 10000,
});

// ========== 基础 CRUD 操作 ==========

// GET 请求 - 获取用户信息
interface User {
  id: number;
  name: string;
  email: string;
}

async function getUser(id: number): Promise<User> {
  const user = await request.get<User>(`/user/${id}`);
  return user;
}

// POST 请求 - 创建用户
interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

async function createUser(data: CreateUserDto): Promise<User> {
  const user = await request.post<User>('/user', data);
  return user;
}

// PUT 请求 - 更新用户
interface UpdateUserDto {
  name?: string;
  email?: string;
}

async function updateUser(id: number, data: UpdateUserDto): Promise<User> {
  const user = await request.put<User>(`/user/${id}`, data);
  return user;
}

// DELETE 请求 - 删除用户
async function deleteUser(id: number): Promise<void> {
  await request.delete(`/user/${id}`);
}

// ========== 带查询参数的请求 ==========

// GET 请求带查询参数
interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

interface UserListResponse {
  list: User[];
  total: number;
}

async function getUserList(params: UserListParams): Promise<UserListResponse> {
  const result = await request.get<UserListResponse>('/user', params);
  return result;
}

// ========== 错误处理 ==========

async function getUserWithErrorHandling(id: number): Promise<User | null> {
  try {
    const user = await request.get<User>(`/user/${id}`);
    return user;
  } catch (error) {
    console.error('获取用户失败:', error);
    return null;
  }
}

// ========== 使用示例 ==========

export async function example() {
  // 获取用户列表
  const userList = await getUserList({ page: 1, pageSize: 10 });
  console.log('用户列表:', userList);

  // 获取单个用户
  const user = await getUser(1);
  console.log('用户信息:', user);

  // 创建用户
  const newUser = await createUser({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
  });
  console.log('新用户:', newUser);

  // 更新用户
  const updatedUser = await updateUser(1, {
    name: 'Jane Doe',
  });
  console.log('更新后的用户:', updatedUser);

  // 删除用户
  await deleteUser(1);
}

export { createUser, deleteUser, getUser, getUserList, getUserWithErrorHandling, updateUser };
