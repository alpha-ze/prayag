import { supabase } from '@/database/supabase';
import { hashPassword, comparePassword, generateToken } from '@/utils/auth';
import { RegisterInput, LoginInput } from '@/utils/validation';
import { User } from '@/types';

export class AuthService {
  async register(userData: RegisterInput): Promise<{ user: User; token: string }> {
    const { email, username, password } = userData;

    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .execute();

    if (checkError) {
      console.error('Database error checking existing user:', checkError);
      throw new Error('Database error during registration');
    }

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email,
          username,
          password_hash: passwordHash,
          role: 'participant'
        }
      ])
      .select('id, email, username, role, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('Database error creating user:', insertError);
      throw new Error('Failed to create user account');
    }

    if (!newUser) {
      throw new Error('Failed to create user account');
    }

    const token = generateToken(newUser);
    return { user: newUser, token };
  }

  async login(credentials: LoginInput): Promise<{ user: User; token: string }> {
    const { email, password } = credentials;

    // Find user by email
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, password_hash, role, created_at, updated_at')
      .eq('email', email)
      .execute();

    if (error) {
      console.error('Database error during login:', error);
      throw new Error('Database error during login');
    }

    if (!users || users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Remove password hash from user object
    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(userWithoutPassword);

    return { user: userWithoutPassword, token };
  }

  async getUserById(userId: string): Promise<User | null> {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, updated_at')
      .eq('id', userId)
      .execute();

    if (error) {
      console.error('Database error getting user:', error);
      return null;
    }

    return users && users.length > 0 ? users[0] : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, updated_at')
      .eq('email', email)
      .execute();

    if (error) {
      console.error('Database error getting user by email:', error);
      return null;
    }

    return users && users.length > 0 ? users[0] : null;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const allowedFields = ['username', 'email'];
    const filteredUpdates: any = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const { data: updatedUsers, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select('id, email, username, role, created_at, updated_at')
      .execute();

    if (error) {
      console.error('Database error updating user:', error);
      throw new Error('Failed to update user');
    }

    if (!updatedUsers || updatedUsers.length === 0) {
      throw new Error('User not found');
    }

    return updatedUsers[0];
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .execute();

    if (fetchError) {
      console.error('Database error fetching user password:', fetchError);
      throw new Error('Database error during password change');
    }

    if (!users || users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId)
      .execute();

    if (updateError) {
      console.error('Database error updating password:', updateError);
      throw new Error('Failed to update password');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .execute();

    if (error) {
      console.error('Database error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async getAllUsers(page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get users with pagination
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      .execute();

    // Get total count
    const { data: countData, error: countError } = await supabase
      .from('users')
      .select('*')
      .execute();

    if (usersError) {
      console.error('Database error getting users:', usersError);
      throw new Error('Failed to fetch users');
    }

    if (countError) {
      console.error('Database error counting users:', countError);
      throw new Error('Failed to count users');
    }

    return {
      users: users || [],
      total: countData ? countData.length : 0,
    };
  }

  async getParticipants(page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get participants with pagination
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, updated_at')
      .eq('role', 'participant')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      .execute();

    // Get total count of participants
    const { data: countData, error: countError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'participant')
      .execute();

    if (usersError) {
      console.error('Database error getting participants:', usersError);
      throw new Error('Failed to fetch participants');
    }

    if (countError) {
      console.error('Database error counting participants:', countError);
      throw new Error('Failed to count participants');
    }

    return {
      users: users || [],
      total: countData ? countData.length : 0,
    };
  }
}