import React, { useState } from 'react';
import { X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import '../styles/main.css';

interface AIListGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string, tasks: { text: string; priority: 'low' | 'medium' | 'high'; subTasks?: string[] }[]) => void;
}

const AIListGeneratorModal: React.FC<AIListGeneratorModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a request first.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // MOCKED AI CALL - In a real app, this would be a fetch to a free AI API
      // simulating a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simple heuristic/mock to "generate" a list based on the prompt
      // For demo purposes, we'll generate some tasks based on keywords
      const lowerPrompt = prompt.toLowerCase();
      let projectName = prompt.length > 20 ? prompt.substring(0, 17) + '...' : prompt;
      let generatedTasks: { text: string; priority: 'low' | 'medium' | 'high'; subTasks?: string[] }[] = [];

      if (lowerPrompt.includes('trip') || lowerPrompt.includes('travel') || lowerPrompt.includes('vacation')) {
        projectName = "✈️ " + (prompt.includes('to') ? 'Trip to ' + prompt.split('to')[1].trim() : 'Travel Plan');
        generatedTasks = [
          { text: "Book flights and accommodation", priority: "high", subTasks: ["Check passport validity", "Compare prices", "Confirm booking"] },
          { text: "Create a packing list", priority: "medium", subTasks: ["Clothes", "Toiletries", "Electronics", "Documents"] },
          { text: "Research local attractions", priority: "medium" },
          { text: "Buy travel insurance", priority: "high" },
          { text: "Exchange currency", priority: "low" }
        ];
      } else if (lowerPrompt.includes('project') || lowerPrompt.includes('work') || lowerPrompt.includes('build')) {
        projectName = "🚀 Project: " + (prompt.includes('to') ? prompt.split('to')[1].trim() : 'New Venture');
        generatedTasks = [
          { text: "Define project goals and scope", priority: "high" },
          { text: "Break down tasks into subtasks", priority: "medium" },
          { text: "Set deadlines and milestones", priority: "high" },
          { text: "Allocate resources", priority: "low" },
          { text: "Review and iterate", priority: "medium" }
        ];
      } else if (lowerPrompt.includes('party') || lowerPrompt.includes('event') || lowerPrompt.includes('birthday')) {
        projectName = "🎉 Event: " + prompt;
        generatedTasks = [
          { text: "Choose a date and time", priority: "high" },
          { text: "Create a guest list", priority: "medium" },
          { text: "Select a venue", priority: "high" },
          { text: "Plan the menu/catering", priority: "medium", subTasks: ["Food", "Drinks", "Special dietary needs"] },
          { text: "Send invitations", priority: "medium" }
        ];
      } else if (lowerPrompt.includes('study') || lowerPrompt.includes('learn') || lowerPrompt.includes('course')) {
        projectName = "📚 Learning: " + (prompt.includes('to') ? prompt.split('to')[1].trim() : 'New Skill');
        generatedTasks = [
          { text: "Identify key learning objectives", priority: "high" },
          { text: "Find study materials", priority: "medium", subTasks: ["Books", "Online courses", "Videos"] },
          { text: "Create a study schedule", priority: "high" },
          { text: "Practice exercises", priority: "medium" },
          { text: "Review and test knowledge", priority: "low" }
        ];
      } else {
        // Generic fallback
        projectName = "✨ AI List: " + projectName;
        generatedTasks = [
          { text: "Initial research and planning", priority: "high" },
          { text: "Identify first steps", priority: "medium" },
          { text: "Organize required tools/resources", priority: "medium" },
          { text: "Execute main task", priority: "high" },
          { text: "Final review and wrap-up", priority: "low" }
        ];
      }

      onGenerate(projectName, generatedTasks);
      setPrompt('');
      onClose();
    } catch (err) {
      setError('AI service is currently unavailable. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="quick-add-flyout glass-effect" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="flyout-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: 'rgba(246, 173, 1, 0.1)', 
            padding: '8px', 
            borderRadius: '10px',
            color: '#f6ad01'
          }}>
            <Sparkles size={24} fill="#f6ad01" fillOpacity={0.2} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>AI Task Architect</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
              Generate efficient lists from your natural language requests.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <textarea
            className="themed-field"
            style={{ 
              minHeight: '120px', 
              resize: 'none', 
              marginBottom: '8px',
              fontFamily: 'inherit',
              padding: '16px'
            }}
            placeholder="e.g., 'Help me plan my 10-day trip to Tokyo next month' or 'Create a launch plan for my new mobile app'..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            autoFocus
          />
          
          {error && <div className="error-text">{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Powered by TaskFlow AI
            </div>
            <button 
              className="themed-primary-btn" 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f6ad01' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="anim-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate List</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIListGeneratorModal;
