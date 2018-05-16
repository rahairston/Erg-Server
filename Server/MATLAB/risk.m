% Path for the sensor reading file
% file_name = 'sensor.csv';
% Path for scripts

path_scripts = '/scripts';

% Defined Variables
%samplingRate = 125;
windowSize = samplingRate * 2;               
%shift_in_sec = 15; % Total duration of work in second.

% Data Preparation
addpath([pwd,path_scripts]);
data = csvread(file_name,1,0);
load('TrainedModel.mat'); % Load trained classifier model

% Risk evaluation
% Risk: 
% 1st column = duration-based risk, 2nd column = frequency-based risk.
% 1st row =  no overexertion, 2nd row = lift/lower, 3rd row = push/pull.
% 0 = low risk, 1 = moderate risk, 2 = high risk.
Risk = sensor2risk(data,classifier_mdl,samplingRate,windowSize,shift_in_sec);

disp(Risk)
