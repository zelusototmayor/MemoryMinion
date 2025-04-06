import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { TranscriptionProcessing } from "./transcription-processing";
import { TranscriptionConfirmation } from "./transcription-confirmation";

export function VoiceRecorder() {
  const { toast } = useToast();
  const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, resetRecording } = useVoiceRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive",
      });
    }
  };
  
  const handleStopRecording = () => {
    stopRecording();
    if (audioBlob) {
      handleTranscription();
    }
  };
  
  const handleTranscription = async () => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      setTranscription(data.text);
      setShowConfirmation(true);
    } catch (error) {
      console.error("Error transcribing audio:", error);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  const handleConfirm = () => {
    // Here you would send the message to a conversation
    // For now, let's just show a toast
    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully.",
    });
    
    // Reset everything
    resetRecording();
    setTranscription("");
    setShowConfirmation(false);
  };
  
  const handleCancel = () => {
    resetRecording();
    setTranscription("");
    setShowConfirmation(false);
    setIsTranscribing(false);
  };
  
  const handleEdit = (editedText: string) => {
    setTranscription(editedText);
  };
  
  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center z-10">
      {isTranscribing ? (
        <TranscriptionProcessing onCancel={handleCancel} />
      ) : showConfirmation ? (
        <TranscriptionConfirmation 
          text={transcription} 
          onConfirm={handleConfirm} 
          onEdit={handleEdit}
          onCancel={handleCancel} 
        />
      ) : (
        <div className="flex justify-center my-3">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-full">
            {isRecording ? (
              <div className="flex items-center p-2">
                <div className="px-3 py-1 flex items-center text-red-500 animate-pulse">
                  <span className="material-icons mr-1">mic</span>
                  <span>{formatTime(recordingTime)}</span>
                </div>
                <Button
                  onClick={handleStopRecording}
                  className="ml-1 bg-red-500 hover:bg-red-600 h-10 w-10 rounded-full p-0 flex items-center justify-center"
                >
                  <span className="material-icons">stop</span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStartRecording}
                className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-full p-0 flex items-center justify-center"
              >
                <span className="material-icons">mic</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}