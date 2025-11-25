"use client"
import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatRoomId } from '@/utils/roomUtils';
import { useCloneGame } from '@/hooks/useCloneGame';

// Screen Components
import { VerifyingScreen } from '@/components/clone-game/VerifyingScreen';
import { ErrorScreen } from '@/components/clone-game/ErrorScreen';
import { JoinScreen } from '@/components/clone-game/JoinScreen';
import { CalibrationScreen } from '@/components/clone-game/CalibrationScreen';
import { WaitScreen } from '@/components/clone-game/WaitScreen';
import { SpeakerDecideScreen } from '@/components/clone-game/SpeakerDecideScreen';
import { VotingScreen } from '@/components/clone-game/VotingScreen';
import { ResultScreen } from '@/components/clone-game/ResultScreen';
import { LeaderboardScreen } from '@/components/clone-game/LeaderboardScreen';

interface CloneRoomJoinPageProps {
  params: Promise<{ roomId: string }>;
}

export default function CloneRoomJoinPage({ params }: CloneRoomJoinPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const urlRoomId = resolvedParams.roomId;

  // Redirect to lowercase URL if uppercase is detected
  useEffect(() => {
    const lowerRoomId = urlRoomId.toLowerCase();
    if (urlRoomId !== lowerRoomId) {
      router.replace(`/clone/${lowerRoomId}`);
    }
  }, [urlRoomId, router]);

  // Format for actual room lookup (converts to uppercase)
  const roomCode = formatRoomId(urlRoomId);

  const game = useCloneGame(roomCode);

  // Render appropriate screen
  switch (game.currentScreen) {
    case 'VERIFYING':
      return <VerifyingScreen />;

    case 'ERROR':
      return <ErrorScreen error={game.error} roomCode={roomCode} />;

    case 'RB-A':
      return (
        <JoinScreen
          roomCode={roomCode}
          name={game.name}
          setName={game.setName}
          selectedColor={game.selectedColor}
          setSelectedColor={game.setSelectedColor}
          onJoin={game.handleJoin}
          room={game.room}
          me={game.me}
          players={game.players}
          currentRound={game.currentRound}
          loading={game.loading}
          error={game.error}
        />
      );

    case 'RB-B':
      return (
        <CalibrationScreen
          questions={game.calibrationQuestions}
          answers={game.calibrationAnswers}
          setAnswers={game.setCalibrationAnswers}
          onSubmit={game.handleSubmitTraits}
          room={game.room}
          me={game.me}
          players={game.players}
          currentRound={game.currentRound}
          loading={game.loading}
          error={game.error}
        />
      );

    case 'RB-C':
      return (
        <WaitScreen
          room={game.room}
          me={game.me}
          players={game.players}
          currentRound={game.currentRound}
          isSpeaker={game.isSpeaker}
          prepTimeRemaining={game.prepTimeRemaining}
          loading={game.loading}
          error={game.error}
        />
      );

    case 'RB-D':
      return (
        <SpeakerDecideScreen
          room={game.room}
          me={game.me}
          players={game.players}
          currentRound={game.currentRound}
          speakerChoice={game.speakerChoice}
          onChoice={game.handleSpeakerChoice}
          prepTimeRemaining={game.prepTimeRemaining}
          loading={game.loading}
          error={game.error}
        />
      );

    case 'RB-E':
      return (
        <VotingScreen
          room={game.room}
          me={game.me}
          players={game.players}
          currentRound={game.currentRound}
          hasVoted={game.hasVoted}
          myVote={game.myVote}
          timeRemaining={game.timeRemaining}
          isVotingOpen={game.isVotingOpen}
          onVote={game.handleVote}
          loading={game.loading}
          error={game.error}
        />
      );

    case 'RB-F':
      return (
        <ResultScreen
          room={game.room}
          me={game.me}
          players={game.players}
          currentRound={game.currentRound}
          myVote={game.myVote}
          isSpeaker={game.isSpeaker}
          loading={game.loading}
          error={game.error}
        />
      );

    case 'RB-G':
      return (
        <LeaderboardScreen
          room={game.room}
          me={game.me}
          players={game.players}
          currentRound={game.currentRound}
          isSpeaker={game.isSpeaker}
          loading={game.loading}
          error={game.error}
        />
      );

    default:
      return <VerifyingScreen />;
  }
}
