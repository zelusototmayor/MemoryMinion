import { Button } from "@/components/ui/button";

type VoiceRecorderProps = {
  isRecording: boolean;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export function VoiceRecorder({ 
  isRecording, 
  recordingTime, 
  onStartRecording, 
  onStopRecording 
}: VoiceRecorderProps) {
  return (
    <Button
      size="icon"
      variant={isRecording ? "destructive" : "default"}
      className={`h-10 w-10 rounded-full flex items-center justify-center ${
        isRecording 
          ? "bg-red-500 recording-animation" 
          : "bg-primary"
      }`}
      onClick={isRecording ? onStopRecording : onStartRecording}
    >
      <span className="material-icons">
        {isRecording ? "stop" : "mic"}
      </span>
    </Button>
  );
}
