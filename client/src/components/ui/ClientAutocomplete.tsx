'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/Icon';

interface Client {
  _id: string;
  name: string;
  phone: string;
}

interface ClientAutocompleteProps {
  clients: Client[];
  value: {
    client_id: string;
    client_type: 'existing' | 'one_time';
    one_time_client_name: string;
    one_time_client_phone: string;
  };
  onChange: (value: {
    client_id: string;
    client_type: 'existing' | 'one_time';
    one_time_client_name: string;
    one_time_client_phone: string;
  }) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function ClientAutocomplete({
  clients,
  value,
  onChange,
  placeholder = 'Mijoz ismini kiriting...',
  className = '',
  required = false
}: ClientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Tanlangan mijozni topish
  const selectedClient = clients.find(client => client._id === value.client_id);

  // Filtrlangan mijozlar
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  // Tashqariga bosilganda yopish
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (!selectedClient && searchTerm && !showPhoneInput) {
          // Agar mijoz topilmasa va telefon kiritilmagan bo'lsa, searchTerm'ni ism sifatida saqlash
          if (searchTerm.trim().length >= 2) {
            setShowPhoneInput(true);
            onChange({
              client_id: '',
              client_type: 'one_time',
              one_time_client_name: searchTerm.trim(),
              one_time_client_phone: value.one_time_client_phone
            });
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchTerm, selectedClient, showPhoneInput, value.one_time_client_phone, onChange]);

  // Input qiymatini o'zgartirish
  const handleInputChange = (inputValue: string) => {
    setSearchTerm(inputValue);
    setIsOpen(true);
    setShowPhoneInput(false);

    // Agar input bo'sh bo'lsa, hamma narsani tozalash
    if (!inputValue.trim()) {
      onChange({
        client_id: '',
        client_type: 'existing',
        one_time_client_name: '',
        one_time_client_phone: ''
      });
      return;
    }

    // Agar aniq mos keluvchi mijoz topilsa
    const exactMatch = clients.find(client => 
      client.name.toLowerCase() === inputValue.toLowerCase()
    );

    if (exactMatch) {
      onChange({
        client_id: exactMatch._id,
        client_type: 'existing',
        one_time_client_name: '',
        one_time_client_phone: ''
      });
    } else {
      // Agar mos keluvchi mijoz yo'q bo'lsa va 2+ belgi bo'lsa
      if (inputValue.trim().length >= 2 && filteredClients.length === 0) {
        // Bir martalik mijozga o'tish
        onChange({
          client_id: '',
          client_type: 'one_time',
          one_time_client_name: inputValue.trim(),
          one_time_client_phone: value.one_time_client_phone
        });
        setShowPhoneInput(true);
        setIsOpen(false);
      }
    }
  };

  // Mijozni tanlash
  const handleSelectClient = (client: Client) => {
    setSearchTerm(client.name);
    setIsOpen(false);
    setShowPhoneInput(false);
    onChange({
      client_id: client._id,
      client_type: 'existing',
      one_time_client_name: '',
      one_time_client_phone: ''
    });
  };

  // Telefon raqamini o'zgartirish
  const handlePhoneChange = (phone: string) => {
    onChange({
      client_id: '',
      client_type: 'one_time',
      one_time_client_name: value.one_time_client_name,
      one_time_client_phone: phone
    });
  };

  // Display qiymatini hisoblash
  const getDisplayValue = () => {
    if (selectedClient) {
      return selectedClient.name;
    }
    if (value.client_type === 'one_time' && value.one_time_client_name) {
      return value.one_time_client_name;
    }
    return searchTerm;
  };

  // Focus bo'lganda
  const handleFocus = () => {
    setIsOpen(true);
    if (selectedClient) {
      setSearchTerm(selectedClient.name);
    } else if (value.one_time_client_name) {
      setSearchTerm(value.one_time_client_name);
    }
  };

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {/* Asosiy input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={getDisplayValue()}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="input-field pr-10"
          required={required}
        />
        
        {/* Status icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {value.client_type === 'existing' && selectedClient ? (
            <Icon name="check-circle" className="w-5 h-5 text-green-500" />
          ) : value.client_type === 'one_time' && value.one_time_client_name ? (
            <Icon name="user-plus" className="w-5 h-5 text-blue-500" />
          ) : (
            <Icon name="search" className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Dropdown */}
        {isOpen && searchTerm && filteredClients.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="overflow-y-auto max-h-60">
              {filteredClients.map((client) => (
                <div
                  key={client._id}
                  onClick={() => handleSelectClient(client)}
                  className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    client._id === value.client_id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{client.name}</div>
                      <div className="text-sm text-gray-600">{client.phone}</div>
                    </div>
                    <Icon name="user-check" className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Telefon input (bir martalik mijoz uchun) */}
      {(showPhoneInput || (value.client_type === 'one_time' && value.one_time_client_name)) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Icon name="user-plus" className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">Bir martalik mijoz</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon raqami *
            </label>
            <input
              ref={phoneInputRef}
              type="tel"
              value={value.one_time_client_phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+998901234567"
              className="input-field"
              required={value.client_type === 'one_time'}
            />
          </div>
        </div>
      )}

      {/* Status ko'rsatkich */}
      <div className="text-xs text-gray-500">
        {value.client_type === 'existing' && selectedClient ? (
          <div className="flex items-center text-green-600">
            <Icon name="check-circle" className="w-3 h-3 mr-1" />
            Doimiy mijoz tanlandi
          </div>
        ) : value.client_type === 'one_time' && value.one_time_client_name ? (
          <div className="flex items-center text-blue-600">
            <Icon name="user-plus" className="w-3 h-3 mr-1" />
            Bir martalik mijoz: {value.one_time_client_name}
          </div>
        ) : (
          <div className="flex items-center text-gray-400">
            <Icon name="info" className="w-3 h-3 mr-1" />
            Mijoz ismini yozing - agar ro'yxatda bo'lmasa, avtomatik bir martalik mijoz bo'ladi
          </div>
        )}
      </div>

      {/* Hidden inputs for form validation */}
      {required && (
        <>
          <input
            type="text"
            value={value.client_type === 'existing' ? value.client_id : value.one_time_client_name}
            onChange={() => {}}
            required
            className="absolute opacity-0 pointer-events-none"
            tabIndex={-1}
          />
          {value.client_type === 'one_time' && (
            <input
              type="text"
              value={value.one_time_client_phone}
              onChange={() => {}}
              required
              className="absolute opacity-0 pointer-events-none"
              tabIndex={-1}
            />
          )}
        </>
      )}
    </div>
  );
}