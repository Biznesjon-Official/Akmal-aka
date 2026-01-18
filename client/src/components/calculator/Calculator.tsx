'use client';

import { useReducer, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// Calculator state type
interface CalculatorState {
  display: string;
  previousValue: string;
  operation: string | null;
  waitingForOperand: boolean;
  memory: string;
}

// Action types
type CalculatorAction =
  | { type: 'INPUT_DIGIT'; digit: string }
  | { type: 'INPUT_DOT' }
  | { type: 'CLEAR' }
  | { type: 'CLEAR_ALL' }
  | { type: 'BACKSPACE' }
  | { type: 'TOGGLE_SIGN' }
  | { type: 'PERCENT' }
  | { type: 'OPERATION'; operation: string }
  | { type: 'EQUALS' }
  | { type: 'MEMORY_ADD' }
  | { type: 'MEMORY_SUBTRACT' }
  | { type: 'MEMORY_RECALL' }
  | { type: 'MEMORY_CLEAR' };

// Initial state
const initialState: CalculatorState = {
  display: '0',
  previousValue: '',
  operation: null,
  waitingForOperand: false,
  memory: '0',
};

// Safe calculation to avoid floating point errors
const calculate = (a: number, b: number, operation: string): number | string => {
  // Use high precision calculation
  const precision = 10;
  const multiplier = Math.pow(10, precision);
  
  switch (operation) {
    case '+':
      return Math.round((a + b) * multiplier) / multiplier;
    case '-':
      return Math.round((a - b) * multiplier) / multiplier;
    case '*':
      return Math.round((a * b) * multiplier) / multiplier;
    case '/':
      if (b === 0) return 'Error'; // Prevent division by zero
      return Math.round((a / b) * multiplier) / multiplier;
    default:
      return b;
  }
};

// Reducer function
const calculatorReducer = (state: CalculatorState, action: CalculatorAction): CalculatorState => {
  switch (action.type) {
    case 'INPUT_DIGIT': {
      if (state.waitingForOperand) {
        return {
          ...state,
          display: action.digit,
          waitingForOperand: false,
        };
      }
      
      if (state.display === '0') {
        return { ...state, display: action.digit };
      }
      
      // Limit to 15 digits
      if (state.display.replace(/[^0-9]/g, '').length >= 15) {
        return state;
      }
      
      return { ...state, display: state.display + action.digit };
    }

    case 'INPUT_DOT': {
      if (state.waitingForOperand) {
        return { ...state, display: '0.', waitingForOperand: false };
      }
      
      if (state.display.includes('.')) {
        return state;
      }
      
      return { ...state, display: state.display + '.' };
    }

    case 'CLEAR': {
      return { 
        ...state, 
        display: '0',
        previousValue: '',
        operation: null,
        waitingForOperand: false
      };
    }

    case 'CLEAR_ALL': {
      return { ...initialState, memory: state.memory };
    }

    case 'BACKSPACE': {
      if (state.waitingForOperand || state.display === '0' || state.display === 'Error') {
        return state;
      }
      
      const newDisplay = state.display.slice(0, -1);
      return { 
        ...state, 
        display: newDisplay === '' || newDisplay === '-' ? '0' : newDisplay 
      };
    }

    case 'TOGGLE_SIGN': {
      if (state.display === '0' || state.display === 'Error') {
        return state;
      }
      const value = parseFloat(state.display);
      if (isNaN(value)) return state;
      return { ...state, display: String(-value) };
    }

    case 'PERCENT': {
      if (state.display === 'Error') return state;
      const value = parseFloat(state.display);
      if (isNaN(value)) return state;
      return { ...state, display: String(value / 100) };
    }

    case 'OPERATION': {
      if (state.display === 'Error') {
        return { ...initialState, memory: state.memory };
      }

      const inputValue = parseFloat(state.display);
      if (isNaN(inputValue)) return state;

      if (state.previousValue === '') {
        return {
          ...state,
          previousValue: state.display,
          operation: action.operation,
          waitingForOperand: true,
        };
      }

      if (state.operation && !state.waitingForOperand) {
        const previousValue = parseFloat(state.previousValue);
        const result = calculate(previousValue, inputValue, state.operation);

        return {
          ...state,
          display: String(result),
          previousValue: String(result),
          operation: action.operation,
          waitingForOperand: true,
        };
      }

      // If waiting for operand, just change the operation
      return {
        ...state,
        operation: action.operation,
      };
    }

    case 'EQUALS': {
      if (!state.operation || state.previousValue === '' || state.display === 'Error') {
        return state;
      }

      const previousValue = parseFloat(state.previousValue);
      const inputValue = parseFloat(state.display);
      
      if (isNaN(previousValue) || isNaN(inputValue)) return state;
      
      const result = calculate(previousValue, inputValue, state.operation);

      return {
        ...state,
        display: String(result),
        previousValue: '',
        operation: null,
        waitingForOperand: true,
      };
    }

    case 'MEMORY_ADD': {
      if (state.display === 'Error') return state;
      const currentMemory = parseFloat(state.memory);
      const currentValue = parseFloat(state.display);
      if (isNaN(currentValue)) return state;
      return { ...state, memory: String(currentMemory + currentValue) };
    }

    case 'MEMORY_SUBTRACT': {
      if (state.display === 'Error') return state;
      const currentMemory = parseFloat(state.memory);
      const currentValue = parseFloat(state.display);
      if (isNaN(currentValue)) return state;
      return { ...state, memory: String(currentMemory - currentValue) };
    }

    case 'MEMORY_RECALL': {
      return { ...state, display: state.memory, waitingForOperand: true };
    }

    case 'MEMORY_CLEAR': {
      return { ...state, memory: '0' };
    }

    default:
      return state;
  }
};

export default function Calculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  // Format display value
  const formatDisplay = (value: string): string => {
    if (value === 'Error') return 'Xato';
    
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    // If the value has a decimal point but no digits after it, keep it
    if (value.endsWith('.')) {
      return value;
    }
    
    // Format with commas for thousands
    if (Math.abs(num) >= 1000) {
      return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
    }
    
    return value;
  };

  // Keyboard support
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const key = event.key;

    if (/^[0-9]$/.test(key)) {
      dispatch({ type: 'INPUT_DIGIT', digit: key });
    } else if (key === '.' || key === ',') {
      dispatch({ type: 'INPUT_DOT' });
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      dispatch({ type: 'OPERATION', operation: key });
    } else if (key === 'Enter' || key === '=') {
      event.preventDefault();
      dispatch({ type: 'EQUALS' });
    } else if (key === 'Escape') {
      dispatch({ type: 'CLEAR_ALL' });
    } else if (key === 'Backspace') {
      dispatch({ type: 'BACKSPACE' });
    } else if (key === 'Delete') {
      dispatch({ type: 'CLEAR' });
    } else if (key === '%') {
      dispatch({ type: 'PERCENT' });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Button component
  const Button = ({ 
    children, 
    onClick, 
    className = '', 
    variant = 'default' 
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    className?: string;
    variant?: 'default' | 'operation' | 'equals' | 'function';
  }) => {
    const baseClass = 'h-16 rounded-xl font-semibold text-lg transition-all duration-150 active:scale-95 shadow-sm';
    const variants = {
      default: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
      operation: 'bg-orange-500 hover:bg-orange-400 text-white',
      equals: 'bg-green-500 hover:bg-green-400 text-white',
      function: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClass} ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  const hasMemory = parseFloat(state.memory) !== 0;

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      {/* Display */}
      <div className="mb-6">
        {/* Memory indicator */}
        {hasMemory && (
          <div className="text-orange-500 text-sm mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            M: {formatDisplay(state.memory)}
          </div>
        )}
        
        {/* Operation indicator */}
        {state.operation && (
          <div className="text-gray-500 text-sm mb-1">
            {formatDisplay(state.previousValue)} {state.operation}
          </div>
        )}
        
        {/* Main display */}
        <div className="bg-gray-50 rounded-xl p-4 text-right border border-gray-200">
          <div className="text-gray-900 text-4xl font-light overflow-x-auto">
            {formatDisplay(state.display)}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {/* Row 1: Memory & Functions */}
        <Button variant="function" onClick={() => dispatch({ type: 'MEMORY_CLEAR' })}>
          MC
        </Button>
        <Button variant="function" onClick={() => dispatch({ type: 'MEMORY_RECALL' })}>
          MR
        </Button>
        <Button variant="function" onClick={() => dispatch({ type: 'MEMORY_SUBTRACT' })}>
          M-
        </Button>
        <Button variant="function" onClick={() => dispatch({ type: 'MEMORY_ADD' })}>
          M+
        </Button>

        {/* Row 2: Clear & Operations */}
        <Button variant="function" onClick={() => dispatch({ type: 'CLEAR_ALL' })}>
          AC
        </Button>
        <Button variant="function" onClick={() => dispatch({ type: 'CLEAR' })}>
          C
        </Button>
        <Button variant="function" onClick={() => dispatch({ type: 'PERCENT' })}>
          %
        </Button>
        <Button variant="operation" onClick={() => dispatch({ type: 'OPERATION', operation: '/' })}>
          ÷
        </Button>

        {/* Row 3: 7, 8, 9, × */}
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '7' })}>7</Button>
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '8' })}>8</Button>
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '9' })}>9</Button>
        <Button variant="operation" onClick={() => dispatch({ type: 'OPERATION', operation: '*' })}>
          ×
        </Button>

        {/* Row 4: 4, 5, 6, - */}
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '4' })}>4</Button>
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '5' })}>5</Button>
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '6' })}>6</Button>
        <Button variant="operation" onClick={() => dispatch({ type: 'OPERATION', operation: '-' })}>
          −
        </Button>

        {/* Row 5: 1, 2, 3, + */}
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '1' })}>1</Button>
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '2' })}>2</Button>
        <Button onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '3' })}>3</Button>
        <Button variant="operation" onClick={() => dispatch({ type: 'OPERATION', operation: '+' })}>
          +
        </Button>

        {/* Row 6: 0, ., = */}
        <Button className="col-span-2" onClick={() => dispatch({ type: 'INPUT_DIGIT', digit: '0' })}>
          0
        </Button>
        <Button onClick={() => dispatch({ type: 'INPUT_DOT' })}>.</Button>
        <Button variant="equals" onClick={() => dispatch({ type: 'EQUALS' })}>
          =
        </Button>
      </div>

      {/* Keyboard hint */}
      <div className="mt-4 text-center text-gray-400 text-xs">
        Klaviatura bilan ham ishlaydi
      </div>
    </div>
  );
}
