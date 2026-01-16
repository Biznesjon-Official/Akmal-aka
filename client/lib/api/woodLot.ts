const API_URL = 'http://localhost:5002/api/wood';

interface WoodLot {
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

async function getWoodLots(): Promise<WoodLot[]> {
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
      throw new Error(`Failed to fetch wood lots: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const data = text ? JSON.parse(text) : { woods: [] };
    return data.woods || [];
  } catch (error) {
    console.error('Error fetching wood lots:', error);
    throw error;
  }
};

const getWoodLotById = async (id: string): Promise<WoodLot> => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch wood lot');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching wood lot ${id}:`, error);
    throw error;
  }
};

const createWoodLot = async (woodLotData: Partial<WoodLot>): Promise<WoodLot> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(woodLotData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create wood lot');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating wood lot:', error);
    throw error;
  }
};

const updateWoodLot = async (id: string, woodLotData: Partial<WoodLot>): Promise<WoodLot> => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(woodLotData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update wood lot');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating wood lot ${id}:`, error);
    throw error;
  }
};

const deleteWoodLot = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete wood lot');
    }
  } catch (error) {
    console.error(`Error deleting wood lot ${id}:`, error);
    throw error;
  }
};

const updateWoodLotStatus = async (id: string, status: string): Promise<WoodLot> => {
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
      throw new Error(errorData.message || 'Failed to update wood lot status');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating wood lot ${id} status:`, error);
    throw error;
  }
};

const calculateWoodLotProfit = async (id: string) => {
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
    console.error(`Error calculating profit for wood lot ${id}:`, error);
    throw error;
  }
};

// Export all functions as named exports
export {
  getWoodLots,
  getWoodLotById,
  createWoodLot,
  updateWoodLot,
  deleteWoodLot,
  updateWoodLotStatus,
  calculateWoodLotProfit
};

export type { WoodLot };
