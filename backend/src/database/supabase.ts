// Simple HTTP-based Supabase client to bypass Node.js version compatibility issues
// This will use fetch to make direct REST API calls to Supabase

// Function to get Supabase config (called after dotenv is loaded)
const getSupabaseConfig = () => {
  // Hardcoded for testing - REMOVE IN PRODUCTION
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mvtqlrpibufzmmysavhr.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dHFscnBpYnVmem1teXNhdmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDk1OTUsImV4cCI6MjEwNTI4NTU5NX0.u-WrDd8UXbQOqUZywqU-jSHXQH17u6dumlDZBDnK4Cg';

  console.log('Loading Supabase config:');
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_ANON_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  }

  return { supabaseUrl, supabaseKey };
};

// Enhanced Supabase API client with proper filtering support
class SupabaseQueryBuilder {
  private baseUrl: string;
  private headers: Record<string, string>;
  private table: string;
  private selectColumns: string = '*';
  private filters: string[] = [];
  private orderClause: string = '';
  private rangeHeader: string = '';
  private isSingle: boolean = false;

  constructor(baseUrl: string, headers: Record<string, string>, table: string) {
    this.baseUrl = baseUrl;
    this.headers = { ...headers };
    this.table = table;
  }

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  or(conditions: string) {
    this.filters.push(`or=(${conditions})`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.orderClause = `order=${column}.${direction}`;
    return this;
  }

  range(start: number, end: number) {
    this.rangeHeader = `${start}-${end}`;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async execute() {
    try {
      const queryParams = [`select=${this.selectColumns}`];
      
      if (this.filters.length > 0) {
        queryParams.push(...this.filters);
      }
      
      if (this.orderClause) {
        queryParams.push(this.orderClause);
      }
      
      const query = `?${queryParams.join('&')}`;
      const headers = { ...this.headers };
      
      if (this.rangeHeader) {
        headers['Range'] = this.rangeHeader;
      }
      
      if (this.isSingle) {
        headers['Accept'] = 'application/vnd.pgjson.object+json';
      }
      
      const url = `${this.baseUrl}/${this.table}${query}`;
      console.log('Making Supabase request:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase error response:', response.status, errorText);
        return { data: null, error: { message: `HTTP ${response.status}: ${errorText}` } };
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch (error: any) {
      console.error('Supabase request error:', error);
      return { data: null, error: { message: error.message } };
    }
  }
}

// Simple Supabase API client using fetch
class SimpleSupabaseClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(url: string, key: string) {
    console.log('Creating Supabase client with URL:', url, 'and key:', key ? 'PROVIDED' : 'MISSING');
    this.baseUrl = `${url}/rest/v1`;
    console.log('Supabase client created with baseUrl:', this.baseUrl);
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  from(table: string) {
    const baseHeaders = { ...this.headers };
    
    return {
      select: (columns = '*') => {
        const builder = new SupabaseQueryBuilder(this.baseUrl, { ...baseHeaders }, table);
        builder.select(columns);
        return builder;
      },

      insert: (values: any[]) => {
        return {
          select: (columns = '*') => {
            return {
              single: async () => {
                try {
                  const headers = { ...baseHeaders };
                  headers['Prefer'] = 'return=representation';
                  
                  console.log('Making Supabase INSERT request to:', `${this.baseUrl}/${table}`);
                  console.log('Insert data:', values);
                  
                  const response = await fetch(`${this.baseUrl}/${table}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(values)
                  });
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Supabase INSERT error:', response.status, errorText);
                    return { data: null, error: { message: `HTTP ${response.status}: ${errorText}` } };
                  }
                  
                  const data = await response.json();
                  console.log('Supabase INSERT response:', data);
                  return { data: Array.isArray(data) ? data[0] : data, error: null };
                } catch (error: any) {
                  console.error('Supabase INSERT error:', error);
                  return { data: null, error: { message: error.message } };
                }
              }
            };
          }
        };
      },

      update: (values: any) => {
        return {
          eq: (column: string, value: any) => {
            return {
              select: (columns = '*') => {
                return {
                  execute: async () => {
                    try {
                      const filter = `${column}=eq.${encodeURIComponent(value)}`;
                      const url = `${this.baseUrl}/${table}?${filter}`;
                      
                      console.log('Making Supabase UPDATE request to:', url);
                      console.log('Update data:', values);
                      
                      const headers = { ...baseHeaders };
                      headers['Prefer'] = 'return=representation';
                      
                      const response = await fetch(url, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(values)
                      });
                      
                      if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Supabase UPDATE error:', response.status, errorText);
                        return { data: null, error: { message: `HTTP ${response.status}: ${errorText}` } };
                      }
                      
                      const data = await response.json();
                      console.log('Supabase UPDATE response:', data);
                      return { data, error: null };
                    } catch (error: any) {
                      console.error('Supabase UPDATE error:', error);
                      return { data: null, error: { message: error.message } };
                    }
                  }
                };
              }
            };
          }
        };
      },

      delete: () => {
        return {
          eq: (column: string, value: any) => {
            return {
              execute: async () => {
                try {
                  const filter = `${column}=eq.${encodeURIComponent(value)}`;
                  const url = `${this.baseUrl}/${table}?${filter}`;
                  
                  console.log('Making Supabase DELETE request to:', url);
                  
                  const response = await fetch(url, {
                    method: 'DELETE',
                    headers: baseHeaders
                  });
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Supabase DELETE error:', response.status, errorText);
                    return { data: null, error: { message: `HTTP ${response.status}: ${errorText}` } };
                  }
                  
                  console.log('Supabase DELETE successful');
                  return { data: null, error: null };
                } catch (error: any) {
                  console.error('Supabase DELETE error:', error);
                  return { data: null, error: { message: error.message } };
                }
              }
            };
          }
        };
      }
    };
  }

  auth = {
    signUp: async (credentials: any) => {
      return { data: null, error: { message: 'Auth not implemented in simple client' } };
    },
    signIn: async (credentials: any) => {
      return { data: null, error: { message: 'Auth not implemented in simple client' } };
    },
    getSession: async () => {
      return { data: { session: null }, error: null };
    }
  };
}

// Create simple Supabase client (will be initialized when needed)
let supabaseClientInstance: SimpleSupabaseClient | null = null;

const getSupabaseClient = () => {
  if (!supabaseClientInstance) {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    supabaseClientInstance = new SimpleSupabaseClient(supabaseUrl, supabaseKey);
  }
  return supabaseClientInstance;
};

export const supabase = getSupabaseClient();

// Test Supabase API connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing Supabase REST API connection...');
    
    const client = getSupabaseClient();
    
    // Simple query to test connection
    const { data, error } = await client
      .from('users')
      .select('count')
      .execute();
    
    if (error && error.message.includes('relation "users" does not exist')) {
      // Table doesn't exist yet, but connection works
      console.log('✅ Supabase REST API connection successful');
      console.log('⚠️  Database tables not found - please run the schema setup');
      return true;
    } else if (error && error.message.includes('HTTP 4')) {
      // 4xx error means connection works but auth/permission issue
      console.log('✅ Supabase REST API connection successful');
      console.log('⚠️  API accessible but may need authentication or permissions');
      return true;
    } else if (error) {
      console.log('❌ Supabase REST API connection failed:', error.message);
      return false;
    } else {
      console.log('✅ Supabase REST API connection successful');
      console.log('✅ Database tables found and accessible');
      return true;
    }
  } catch (error: any) {
    console.error('❌ Supabase REST API connection failed:', error.message);
    return false;
  }
};

// Helper function to get PostgreSQL pool (deprecated - using API instead)
export const getSupabasePool = () => {
  throw new Error('Direct PostgreSQL connection disabled. Using Supabase REST API instead.');
};

export const closeSupabasePool = async (): Promise<void> => {
  console.log('Supabase REST API client - no connection to close');
};

export default supabase;