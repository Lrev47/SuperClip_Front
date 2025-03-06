import React from 'react';
import { useParams } from 'react-router-dom';

const PromptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Prompt Details</h1>
      <div className="bg-dark-700 rounded-lg p-6">
        <p className="text-gray-300">
          Viewing prompt with ID: {id}
        </p>
        <p className="text-gray-300 mt-4">
          This page is under construction.
        </p>
      </div>
    </div>
  );
};

export default PromptDetailPage; 