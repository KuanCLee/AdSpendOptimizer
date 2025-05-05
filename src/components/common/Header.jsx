const Header = ({ title }) => {
	return (
		<header className='bg-gray-50 backdrop-blur-md shadow-lg border-b border-gray-50'>
			<div className='max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8'>
				<h1 className='text-2xl font-semibold text-pink-700'>{title}</h1>
			</div>
		</header>
	);
};
export default Header;
