const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api/vagon';

interface Vagon {
  _id: string;
  lotCode: string;
  dimensions: string;
  volume: number;
  status: 'xarid_qilindi' | 'transport_kelish' | 'omborda' | 'qayta_ishlash' | 'transport_ketish' | 'sotildi';
  purchaseDetails?: {
    price: number;
    currency: 'RUB' | 'USD';
    seller: string;
    date: string;
    location: string;
    exchangeRate: number;
  };
  transportDetails?: any;
  storageDetails?: any;
  processingDetails?: any;
  saleDetails?: any;
  createdAt: string;
  updatedAt: string;
}

async function getVagons(): Promise<Vagon[]> {
  try {
    const response = await fetch(API_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to fetch vagons: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const data = text ? JSON.parse(text) : { vagons: [] };
    return data.vagons || data.woods || []; // Backward compatibility
  } catch (error) {
    console.error('Error fetching vagons:', error);
    throw error;
  }
};

const getVagonById = async (id: string): Promise<Vagon> => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch vagon');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching vagon ${id}:`, error);
    throw error;
  }
};

const createVagon = async (vagonData: Partial<Vagon>): Promise<Vagon> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(vagonData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create vagon');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating vagon:', error);
    throw error;
  }
};

const updateVagon = async (id: string, vagonData: Partial<Vagon>): Promise<Vagon> => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(vagonData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update vagon');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating vagon ${id}:`, error);
    throw error;
  }
};

const deleteVagon = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete vagon');
    }
  } catch (error) {
    console.error(`Error deleting vagon ${id}:`, error);
    throw error;
  }
};

const updateVagonStatus = async (id: string, status: string): Promise<Vagon> => {
  try {
    const response = await fetch(`${API_URL}/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update vagon status');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating vagon ${id} status:`, error);
    throw error;
  }
};

const calculateVagonProfit = async (id: string) => {
  try {
    const response = await fetch(`${API_URL}/${id}/calculate-profit`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to calculate profit');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calculating profit for vagon ${id}:`, error);
    throw error;
  }
};

// Export all functions as named exports
export {
  getVagons,
  getVagonById,
  createVagon,
  updateVagon,
  deleteVagon,
  updateVagonStatus,
  calculateVagonProfit
};

export type { Vagon };