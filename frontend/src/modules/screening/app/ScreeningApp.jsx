import React, { useState, useEffect } from 'react';
import Start from '../pages/Start';
import Level1 from '../pages/Level1';
import Level2 from '../pages/Level2';
import Level3 from '../pages/Level3';
import Result from '../pages/Result';

export default function ScreeningApp() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [assessmentId, setAssessmentId] = useState(localStorage.getItem('screening_assessmentId') || null);
  const [contextData, setContextData] = useState(null);
  const [resultData, setResultData] = useState(null);

  const handleStart = (newAssessmentId, level1Context) => {
    setAssessmentId(newAssessmentId);
    setContextData(level1Context);
    setCurrentLevel(1);
  };

  const handleLevel1Complete = (level2Context) => {
    setContextData(level2Context);
    setCurrentLevel(2);
  };

  const handleLevel2Complete = (level3Context, resultObj) => {
    if (resultObj) {
      setResultData(resultObj);
      setCurrentLevel('completed');
    } else {
      setContextData(level3Context);
      setCurrentLevel(3);
    }
  };

  const handleLevel3Complete = (resultObj) => {
    setResultData(resultObj);
    setCurrentLevel('completed');
  };

  const resetFlow = () => {
    localStorage.removeItem('screening_assessmentId');
    setAssessmentId(null);
    setContextData(null);
    setResultData(null);
    setCurrentLevel(0);
  };

  const renderCurrentLevel = () => {
    if (currentLevel === 0) {
      return <Start onNext={handleStart} />;
    }
    if (currentLevel === 1) {
      return (
        <Level1 
          assessmentId={assessmentId} 
          initialContext={contextData} 
          onNext={handleLevel1Complete} 
        />
      );
    }
    if (currentLevel === 2) {
      return (
        <Level2 
          assessmentId={assessmentId} 
          initialContext={contextData} 
          onNext={handleLevel2Complete} 
        />
      );
    }
    if (currentLevel === 3) {
      return (
        <Level3 
          assessmentId={assessmentId} 
          initialContext={contextData} 
          onNext={handleLevel3Complete} 
        />
      );
    }
    if (currentLevel === 'completed') {
      return <Result resultData={resultData} onReset={resetFlow} />;
    }
    return <Start onNext={handleStart} />;
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ textAlign: "center", color: "#333", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
        NeuroVia Cognitive Screening
      </h1>
      {renderCurrentLevel()}
    </div>
  );
}
